// Community parking events — the opt-in data layer.
//
// A consenting user's app posts one event when they scan a sign, start or
// stop a timer, answer "did you get a ticket?", or report a wrong reading.
// Aggregated over many users, those events describe what parking is like on
// a street at a given hour, which is what /api/street serves back.
//
// Privacy posture, enforced here rather than promised elsewhere:
//   - nothing is stored without `consent: true` on the request;
//   - coordinates are coarsened to ~110 m before they touch the database;
//   - the device is stored as a salted hash, never the raw id;
//   - the photo is never sent here at all.

import { insert, isConfigured } from './_lib/db.js';
import { checkIpLimit } from './_lib/rateLimit.js';
import { getIp, getDeviceId, hashDeviceId, json, isAustralianCoord, coarsenCoord } from './_lib/request.js';
import { calendarContextSync, sydneyParts } from './_lib/calendar.js';

export const EVENT_KINDS = new Set(['scan', 'timer_start', 'timer_stop', 'outcome', 'feedback']);
const OUTCOMES = new Set(['no_ticket', 'ticket', 'unsure']);
const VERDICT_KINDS = new Set([
  'no_stopping', 'clearway', 'bus_zone', 'taxi_zone', 'works_zone', 'no_parking', 'loading_zone',
  'disabled_only', 'permit_only', 'time_limited', 'meter', 'unrestricted', 'other',
]);
const WEEKDAY_INDEX = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : null) || null;
const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null);

// Turns a request body into a row, or returns { error } for anything that
// should not be stored. Exported for tests.
export function validateEvent(body, { deviceId, now = new Date() } = {}) {
  if (!body || typeof body !== 'object') return { error: 'body_required' };
  if (!EVENT_KINDS.has(body.kind)) return { error: 'invalid_kind' };
  if (body.consent !== true) return { error: 'consent_required' };
  if (!deviceId) return { error: 'device_required' };

  const row = {
    device_hash: hashDeviceId(deviceId),
    kind: body.kind,
    lat: null,
    lon: null,
    street: str(body.street, 120),
    suburb: str(body.suburb, 80),
    can_park: typeof body.canPark === 'boolean' ? body.canPark : null,
    verdict_kind: VERDICT_KINDS.has(body.verdictKind) ? body.verdictKind : null,
    time_limit_minutes: int(body.timeLimitMinutes, 1, 24 * 60),
    duration_ms: int(body.durationMs, 0, 7 * 24 * 60 * 60 * 1000),
    outcome: OUTCOMES.has(body.outcome) ? body.outcome : null,
    confidence: typeof body.confidence === 'number' && body.confidence >= 0 && body.confidence <= 1 ? body.confidence : null,
    feedback: str(body.feedback, 500),
    raw_text: str(body.rawText, 500),
  };

  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (body.lat != null || body.lon != null) {
    if (!isAustralianCoord(lat, lon)) return { error: 'invalid_location' };
    row.lat = coarsenCoord(lat);
    row.lon = coarsenCoord(lon);
  }

  // Location-bearing kinds are useless without a location. Feedback is the
  // exception: a wrong reading is worth knowing about wherever it happened.
  if (body.kind !== 'feedback' && row.lat == null) return { error: 'location_required' };
  if (body.kind === 'outcome' && !row.outcome) return { error: 'outcome_required' };
  if (body.kind === 'feedback' && !row.feedback && !row.raw_text) return { error: 'feedback_required' };

  const parts = sydneyParts(now);
  const cal = calendarContextSync(now);
  row.local_hour = Math.floor(parts.minutes / 60);
  row.local_weekday = WEEKDAY_INDEX[parts.weekday];
  row.is_public_holiday = cal.isPublicHoliday;
  row.is_school_day = cal.isSchoolDay;

  return { row };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const rl = checkIpLimit(getIp(req), { name: 'events', limit: 30 });
  if (!rl.allowed) return json(res, 429, { error: 'rate_limit', retryAfter: rl.retryAfter }, { 'Retry-After': String(rl.retryAfter) });

  const { row, error } = validateEvent(req.body, { deviceId: getDeviceId(req) });
  if (error) return json(res, 400, { error });

  if (!isConfigured()) {
    // Acknowledged, not stored. The client treats this the same as success;
    // the operator sees it in the response if they go looking.
    return json(res, 202, { stored: false, reason: 'not_configured' });
  }

  try {
    await insert('parking_events', [row]);
    return json(res, 202, { stored: true });
  } catch (err) {
    console.error('[ParkSense] event insert failed:', err.message);
    return json(res, 502, { error: 'store_failed' });
  }
}
