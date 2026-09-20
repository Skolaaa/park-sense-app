// The verdict engine.
//
// The model's job is to read the plates on the pole and describe each one as
// structured data. This module's job is to decide whether any of them apply
// right now, which one wins, and what that means for the driver. Keeping the
// decision in code rather than in the prompt is the whole point: a date
// lookup, a precedence rule and a time-window comparison should never be a
// language model's guess.
//
// Plate shape (as produced by api/analyze.js from the model's output):
// {
//   text: string,                 // exact text on the plate
//   kind: one of KIND_PRECEDENCE keys,
//   timeLimitMinutes: number|null,
//   days: ['Mon','Tue',...] | [], // [] means every day
//   startTime: 'HH:MM'|null,      // 24h, Sydney local; null = all hours
//   endTime: 'HH:MM'|null,
//   publicHolidayClause: 'applies'|'excepted'|'silent',
//   schoolDaysOnly: boolean,
//   arrow: 'left'|'right'|'both'|null,
//   paymentRequired: boolean,
//   permitExcepted: boolean,
//   vehicleTypes: string[],       // [] means all vehicles
// }

import { calendarContextSync, sydneyParts } from './calendar.js';
import { fineFor } from './fines.js';

// Higher wins when more than one plate is in effect at the same instant.
export const KIND_PRECEDENCE = {
  no_stopping: 100,
  clearway: 95,
  bus_zone: 90,
  taxi_zone: 90,
  works_zone: 85,
  no_parking: 80,
  loading_zone: 75,
  disabled_only: 70,
  permit_only: 60,
  time_limited: 30,
  meter: 30,
  unrestricted: 0,
  other: -1, // unknown: never decides the verdict, always adds a note
};

const PROHIBITIVE = new Set([
  'no_stopping', 'clearway', 'bus_zone', 'taxi_zone', 'works_zone',
  'no_parking', 'loading_zone', 'disabled_only', 'permit_only',
]);

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TIMELINE_STEP_MS = 15 * 60 * 1000;
export const TIMELINE_SPAN_MS = 12 * 60 * 60 * 1000;

// ─── Normalisation ───────────────────────────────────────────────────────────

const DAY_ALIASES = {
  mon: 'Mon', monday: 'Mon', tue: 'Tue', tues: 'Tue', tuesday: 'Tue',
  wed: 'Wed', wednesday: 'Wed', thu: 'Thu', thur: 'Thu', thurs: 'Thu', thursday: 'Thu',
  fri: 'Fri', friday: 'Fri', sat: 'Sat', saturday: 'Sat', sun: 'Sun', sunday: 'Sun',
};

export function normaliseDays(days) {
  if (!Array.isArray(days)) return [];
  const out = [];
  for (const d of days) {
    const key = DAY_ALIASES[String(d).trim().toLowerCase()];
    if (key && !out.includes(key)) out.push(key);
  }
  return out;
}

export function parseClock(s) {
  if (s == null) return null;
  const m = String(s).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

// Coerces whatever the model returned into a well-typed plate, dropping
// anything unusable. Returns null if there is nothing to work with.
export function normalisePlate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = KIND_PRECEDENCE[raw.kind] !== undefined ? raw.kind : 'other';
  const limit = Number(raw.timeLimitMinutes);
  const clause = ['applies', 'excepted', 'silent'].includes(raw.publicHolidayClause)
    ? raw.publicHolidayClause : 'silent';
  const arrow = ['left', 'right', 'both'].includes(raw.arrow) ? raw.arrow : null;
  return {
    text: typeof raw.text === 'string' ? raw.text.trim() : '',
    kind,
    timeLimitMinutes: Number.isFinite(limit) && limit > 0 ? Math.round(limit) : null,
    days: normaliseDays(raw.days),
    startMinutes: parseClock(raw.startTime),
    endMinutes: parseClock(raw.endTime),
    publicHolidayClause: clause,
    schoolDaysOnly: raw.schoolDaysOnly === true,
    arrow,
    paymentRequired: raw.paymentRequired === true || kind === 'meter',
    permitExcepted: raw.permitExcepted === true,
    vehicleTypes: Array.isArray(raw.vehicleTypes) ? raw.vehicleTypes.filter((v) => typeof v === 'string') : [],
  };
}

// ─── Applicability ───────────────────────────────────────────────────────────

function appliesToSide(plate, selectedSide) {
  if (!plate.arrow || plate.arrow === 'both') return true;
  if (!selectedSide) return true; // unknown side: keep it, and flag ambiguity
  return plate.arrow === selectedSide;
}

function inTimeWindow(plate, minutes) {
  const { startMinutes: s, endMinutes: e } = plate;
  if (s == null || e == null) return true;
  if (s === e) return true;
  if (s < e) return minutes >= s && minutes < e;
  return minutes >= s || minutes < e; // overnight window, e.g. 10pm–6am
}

// Returns { active: boolean, reason: string|null }. The reason explains a
// *negative* answer that a reader might not expect, so the UI can cite it.
export function plateInEffect(plate, { weekday, minutes, calendar }) {
  const namesDays = plate.days.length > 0;

  if (namesDays && !plate.days.includes(weekday)) {
    return { active: false, reason: null };
  }

  if (calendar.isPublicHoliday) {
    if (namesDays && plate.publicHolidayClause !== 'applies') {
      return {
        active: false,
        reason: `Today is a public holiday (${calendar.holidayName}). A sign that lists particular days does not apply on a public holiday unless it says so — NSW Road Rules 2014 reg 318.`,
      };
    }
    if (!namesDays && plate.publicHolidayClause === 'excepted') {
      return {
        active: false,
        reason: `Today is a public holiday (${calendar.holidayName}) and this sign says public holidays are excepted.`,
      };
    }
  }

  if (plate.schoolDaysOnly && !calendar.isSchoolDay) {
    const why = calendar.isPublicHoliday ? 'a public holiday'
      : (weekday === 'Sat' || weekday === 'Sun') ? 'the weekend' : 'the school holidays';
    return {
      active: false,
      reason: `This restriction only operates on school days, and today is ${why}.`,
    };
  }

  if (!inTimeWindow(plate, minutes)) {
    return { active: false, reason: null };
  }

  return { active: true, reason: null };
}

// ─── Evaluation at one instant ───────────────────────────────────────────────

// Pure. `calendar` must be the context for the same instant as `weekday` and
// `minutes`; `evaluateAt` below takes care of that.
export function evaluatePlates(plates, { selectedSide, weekday, minutes, calendar }) {
  const notes = [];
  const relevant = plates.filter((p) => appliesToSide(p, selectedSide));
  const arrows = new Set(plates.map((p) => p.arrow).filter((a) => a && a !== 'both'));
  const sideAmbiguous = !selectedSide && arrows.size > 1;

  let winner = null;
  let uncertain = false;
  const active = [];

  for (const plate of relevant) {
    if (plate.kind === 'other') {
      uncertain = true;
      if (plate.text) notes.push(`Could not classify a plate reading “${plate.text}”. Check it yourself.`);
      continue;
    }
    const { active: isActive, reason } = plateInEffect(plate, { weekday, minutes, calendar });
    if (reason) notes.push(reason);
    if (!isActive) continue;
    active.push(plate);
    if (!winner || KIND_PRECEDENCE[plate.kind] > KIND_PRECEDENCE[winner.kind]) winner = plate;
  }

  const permissive = active.filter((p) => !PROHIBITIVE.has(p.kind));
  const limits = permissive.map((p) => p.timeLimitMinutes).filter((n) => n != null);

  let canPark;
  let kind;
  if (!winner) {
    canPark = true;
    kind = 'unrestricted';
  } else if (PROHIBITIVE.has(winner.kind)) {
    // Permit-only counts as prohibited: the default user has no permit.
    canPark = false;
    kind = winner.kind;
  } else {
    canPark = true;
    kind = winner.kind;
  }

  const timeLimitMinutes = canPark && limits.length ? Math.min(...limits) : null;
  const paymentRequired = canPark && permissive.some((p) => p.paymentRequired);
  const permitExcepted = active.some((p) => p.permitExcepted);

  if (sideAmbiguous) {
    notes.push('The arrows on this sign point both ways. Say which side of the sign you are on for a precise answer.');
  }
  if (winner && winner.kind === 'permit_only') {
    notes.push('Permit holders may park here. Without a permit, treat this as no parking.');
  }
  if (winner && winner.kind === 'loading_zone') {
    notes.push('Loading zones are for goods vehicles. A car may stop only briefly to load or unload.');
  }
  if (winner && winner.kind === 'no_parking') {
    notes.push('No Parking allows a stop of up to 2 minutes to set down or pick up, with the driver staying within 3 metres.');
  }

  return {
    canPark,
    kind,
    timeLimitMinutes,
    paymentRequired,
    permitExcepted,
    winner,
    activePlates: active,
    sideAmbiguous,
    uncertain,
    notes,
  };
}

export function evaluateAt(plates, selectedSide, date) {
  const { weekday, minutes } = sydneyParts(date);
  const calendar = calendarContextSync(date);
  return evaluatePlates(plates, { selectedSide, weekday, minutes, calendar });
}

// ─── Timeline ────────────────────────────────────────────────────────────────

const sameState = (a, b) =>
  a.canPark === b.canPark && a.kind === b.kind && a.timeLimitMinutes === b.timeLimitMinutes;

// Steps forward from `now` and collapses runs of identical verdicts into
// bands, so the UI can draw "park now, move by 4pm" as one strip.
export function buildTimeline(plates, selectedSide, now, spanMs = TIMELINE_SPAN_MS, stepMs = TIMELINE_STEP_MS) {
  const startMs = now.getTime();
  const bands = [];
  let current = null;
  for (let t = startMs; t <= startMs + spanMs; t += stepMs) {
    const v = evaluateAt(plates, selectedSide, new Date(t));
    const state = { canPark: v.canPark, kind: v.kind, timeLimitMinutes: v.timeLimitMinutes };
    if (current && sameState(current, state)) {
      current.endMs = t + stepMs;
    } else {
      current = { startMs: t, endMs: t + stepMs, ...state };
      bands.push(current);
    }
  }
  // Clamp the final band to the span so the strip has a clean right edge.
  if (bands.length) bands[bands.length - 1].endMs = startMs + spanMs;
  return bands;
}

// ─── Top level ───────────────────────────────────────────────────────────────

export function decide(rawPlates, { selectedSide = null, now = new Date() } = {}) {
  const plates = (Array.isArray(rawPlates) ? rawPlates : []).map(normalisePlate).filter(Boolean);
  const nowResult = evaluateAt(plates, selectedSide, now);
  const timeline = plates.length ? buildTimeline(plates, selectedSide, now) : [];

  // The next moment the answer changes, if it changes inside the window.
  const nextBand = timeline.length > 1 ? timeline[1] : null;
  const nextChange = nextBand
    ? { atMs: nextBand.startMs, canPark: nextBand.canPark, kind: nextBand.kind, timeLimitMinutes: nextBand.timeLimitMinutes }
    : null;

  // When you can park now, the hard stop is the earlier of the posted limit
  // and the next moment parking becomes prohibited.
  let mustLeaveByMs = null;
  if (nowResult.canPark) {
    const byLimit = nowResult.timeLimitMinutes ? now.getTime() + nowResult.timeLimitMinutes * 60_000 : null;
    const nextNoPark = timeline.find((b) => b.startMs > now.getTime() && !b.canPark)?.startMs ?? null;
    const candidates = [byLimit, nextNoPark].filter((v) => v != null);
    mustLeaveByMs = candidates.length ? Math.min(...candidates) : null;
  }

  const fine = nowResult.canPark
    ? (nowResult.timeLimitMinutes ? fineFor(nowResult.paymentRequired ? 'meter' : 'time_limited', now) : null)
    : fineFor(nowResult.kind, now);

  return {
    plates,
    ...nowResult,
    calendar: calendarContextSync(now),
    timeline,
    nextChange,
    mustLeaveByMs,
    fine,
  };
}

export const _internal = { DAY_KEYS, PROHIBITIVE };
