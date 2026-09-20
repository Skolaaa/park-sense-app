// Vercel serverless function — proxies requests to OpenAI so the API key
// never leaves the server and is not visible in the browser.
//
// Division of labour, which is the point of this file's shape:
//   the model READS the sign and describes each plate as structured data;
//   the verdict engine (api/_lib/verdict.js) DECIDES what applies right now,
//   using the NSW calendar (public holidays, school days) and precedence rules
//   that a language model should never be asked to guess.

import { getCalendarContext } from './_lib/calendar.js';
import { decide, KIND_PRECEDENCE } from './_lib/verdict.js';
import { finesPromptBlock, fineFor } from './_lib/fines.js';
import { checkIpLimit, checkDeviceQuota } from './_lib/rateLimit.js';
import { getIp, getDeviceId, json } from './_lib/request.js';

export const MODEL = 'gpt-4o';
export const RULES_VERSION = '2026-09-19';
const IP_LIMIT_PER_MINUTE = 10;

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildSystemPrompt({ selectedSide, calendar, nowLabel }) {
  const directional = selectedSide
    ? `The driver is on the ${selectedSide.toUpperCase()} side of the sign as they face it. Report every plate regardless; the arrow field on each plate is how the rules get applied to their side.`
    : `The driver has not said which side of the sign they are on. Report every plate with its arrow.`;

  return `You read Australian parking signs for drivers in Sydney, New South Wales.

Your only job is to transcribe the sign into structured data, one entry per plate (each separately-bordered panel on the pole is a plate). Do NOT decide whether the driver may park. Do NOT reason about the current time, day, public holidays or school terms — that is done in code after you answer, from the calendar. If you guess at it you will be wrong on public holidays.

Context (for your information only): it is ${nowLabel} in Sydney.${calendar.isPublicHoliday ? ` Today is a public holiday (${calendar.holidayName}).` : ''}
${directional}

Return ONLY a JSON object with exactly these fields:
{
  "noSignFound": boolean,        // true if there is no parking sign legible in the image
  "rawText": string,             // every word and symbol on the sign, top plate to bottom, one plate per line
  "confidence": number,          // 0-1: how sure you are that rawText and plates are complete and correct
  "observations": string[],      // anything a driver should know: glare, a plate cut off, a temporary cover, a second pole
  "plates": [
    {
      "text": string,            // exact text of this plate
      "kind": "no_stopping" | "clearway" | "bus_zone" | "taxi_zone" | "works_zone" | "no_parking" | "loading_zone" | "disabled_only" | "permit_only" | "time_limited" | "meter" | "unrestricted" | "other",
      "timeLimitMinutes": number | null,   // "2P" = 120, "1/4P" = 15, "1/2P" = 30, "1P" = 60, "4P" = 240; null if no limit
      "days": string[],          // e.g. ["Mon","Tue","Wed","Thu","Fri"]; "Mon-Fri" expands to five; [] if no days shown
      "startTime": "HH:MM" | null,   // 24-hour; null if no hours shown
      "endTime": "HH:MM" | null,
      "publicHolidayClause": "applies" | "excepted" | "silent",   // "applies" only if the plate says it operates on public holidays; "excepted" if it says public holidays excepted; otherwise "silent"
      "schoolDaysOnly": boolean, // true if the plate says "School Days"
      "arrow": "left" | "right" | "both" | null,   // direction the arrow points as you face the sign; "both" for a double-headed arrow; null if none
      "paymentRequired": boolean,   // ticket, meter, "pay", "$" or a phone-app logo
      "permitExcepted": boolean,    // "Permit Holders Excepted" or an area permit exemption
      "vehicleTypes": string[]      // [] unless the plate names a vehicle class
    }
  ]
}

Classifying "kind":
- "No Stopping" (red on white, or the S-in-circle symbol) → no_stopping.
- "No Parking" (green on white, or the P-in-circle symbol with a bar) → no_parking.
- Clearway (red C on white) → clearway. Bus Zone → bus_zone. Taxi Zone → taxi_zone. Works Zone → works_zone.
- Yellow Loading Zone → loading_zone.
- A wheelchair symbol alone → disabled_only. "Permit Holders Only" → permit_only.
- "P" with a number (1P, 2P, 1/2P, 4P) → time_limited. "Ticket", "Meter", "Pay" with a P → meter.
- "P" alone with no limit → unrestricted.
- If you cannot tell → other, and put the text in "text".

Arrows: a single-headed arrow governs the road on the side it points to, as you face the sign. Read it literally.

NSW fine amounts for context only — do not put them in your answer:
${finesPromptBlock()}`;
}

// ─── Response shaping ────────────────────────────────────────────────────────

const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

// "2 hours" / "30 minutes" / "1 hour 30 minutes" — the shape the client's
// parseTimeLimit already understands.
export function formatMinutes(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  return parts.join(' ');
}

function clock12(minutes) {
  if (minutes == null) return null;
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

// The plate the details card describes. When something is in force that is
// the winner; when nothing is, it is the most restrictive plate on the pole,
// so an out-of-hours sign still shows its days and hours instead of nothing.
function describedPlate(verdict) {
  if (verdict.winner) return verdict.winner;
  return verdict.plates
    .filter((p) => p.kind !== 'other')
    .sort((a, b) => (KIND_PRECEDENCE[b.kind] ?? -1) - (KIND_PRECEDENCE[a.kind] ?? -1))[0] ?? null;
}

export function shapeResponse({ parsed, verdict, selectedSide, calendar, now }) {
  const winner = describedPlate(verdict);
  const observations = Array.isArray(parsed.observations) ? parsed.observations.filter((o) => typeof o === 'string') : [];

  let confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
  if (confidence < 0 || confidence > 1) confidence = 0.5;
  // An unclassified plate means the engine could not fully decide. Push the
  // client onto its "check this one yourself" screen rather than letting a
  // confident-looking verdict stand in front of a plate nobody understood.
  if (verdict.uncertain) confidence = Math.min(confidence, 0.6);

  return {
    noSignFound: false,
    canPark: verdict.canPark,
    kind: verdict.kind,
    timeLimit: formatMinutes(verdict.timeLimitMinutes),
    timeLimitMinutes: verdict.timeLimitMinutes,
    days: winner ? winner.days.map((d) => DAY_NAMES[d]) : [],
    hours: winner && winner.startMinutes != null && winner.endMinutes != null
      ? `${clock12(winner.startMinutes)} - ${clock12(winner.endMinutes)}`
      : null,
    paymentRequired: verdict.paymentRequired,
    vehicleTypes: winner ? winner.vehicleTypes : [],
    specialConditions: [...verdict.notes, ...observations],
    confidence,
    rawText: typeof parsed.rawText === 'string' ? parsed.rawText : '',
    applicableSide: winner ? (winner.arrow ?? 'both') : (selectedSide ?? 'both'),
    estimatedFine: verdict.fine ? verdict.fine.display : null,
    fine: verdict.fine,
    plates: verdict.plates,
    timeline: verdict.timeline,
    nextChange: verdict.nextChange,
    mustLeaveByMs: verdict.mustLeaveByMs,
    calendar,
    sideAmbiguous: verdict.sideAmbiguous,
    uncertain: verdict.uncertain,
    timestamp: now.toISOString(),
    model: MODEL,
    rulesVersion: RULES_VERSION,
  };
}

// Older model outputs (or a future regression) that answer with a verdict
// but no plates. Passed through, labelled, with the calendar attached so the
// client can still show the day context.
function shapeLegacy(parsed, calendar, now) {
  const confidence = typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
    ? parsed.confidence : 0.5;
  const fine = parsed.canPark ? null : fineFor('no_parking', now);
  return {
    ...parsed,
    confidence,
    estimatedFine: parsed.estimatedFine ?? (fine ? fine.display : null),
    plates: [],
    timeline: [],
    nextChange: null,
    mustLeaveByMs: null,
    calendar,
    legacy: true,
    timestamp: now.toISOString(),
    model: MODEL,
    rulesVersion: RULES_VERSION,
  };
}

// ─── Model output parsing ────────────────────────────────────────────────────

export function parseModelJson(content) {
  const clean = String(content ?? '').replace(/```json\n?|\n?```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no_json_block');
    return JSON.parse(match[0]);
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const ip = getIp(req);
  const rl = checkIpLimit(ip, { name: 'analyze', limit: IP_LIMIT_PER_MINUTE });
  if (!rl.allowed) {
    return json(res, 429, { error: 'rate_limit', retryAfter: rl.retryAfter }, { 'Retry-After': String(rl.retryAfter) });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(res, 503, { error: 'no_key' });
  }

  const { imageData, selectedSide: rawSide } = req.body || {};
  if (!imageData || typeof imageData !== 'string') {
    return json(res, 400, { error: 'imageData is required' });
  }
  const selectedSide = rawSide === 'left' || rawSide === 'right' ? rawSide : null;

  // The daily ceiling per install. Counted before the model call, so a
  // request that is over quota costs nothing.
  const deviceId = getDeviceId(req);
  const quota = await checkDeviceQuota(deviceId);
  if (!quota.allowed) {
    return json(res, 429, { error: 'quota', used: quota.used, limit: quota.limit, message: 'Daily scan limit reached. It resets at midnight Sydney time.' });
  }

  const now = new Date();
  const calendar = await getCalendarContext(now);
  const nowLabel = now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'full', timeStyle: 'short' });
  const systemPrompt = buildSystemPrompt({ selectedSide, calendar, nowLabel });

  try {
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Transcribe this parking sign into the JSON structure. Return only JSON.' },
              { type: 'image_url', image_url: { url: imageData, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openAiResponse.ok) {
      const errorData = await openAiResponse.json().catch(() => ({}));
      return json(res, 502, { error: errorData.error?.message || 'OpenAI request failed' });
    }

    const data = await openAiResponse.json();
    const content = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = parseModelJson(content);
    } catch {
      console.error('[ParkSense] Failed to parse OpenAI response:', String(content).slice(0, 500));
      return json(res, 502, { error: 'parse_error', detail: String(content ?? '').slice(0, 200) });
    }

    if (parsed.noSignFound === true) {
      return json(res, 200, {
        noSignFound: true, canPark: false, kind: null, timeLimit: null, timeLimitMinutes: null,
        days: [], hours: null, paymentRequired: false, vehicleTypes: [], specialConditions: [],
        confidence: 0, rawText: '', applicableSide: null, estimatedFine: null, fine: null,
        plates: [], timeline: [], nextChange: null, mustLeaveByMs: null, calendar,
        timestamp: now.toISOString(), model: MODEL, rulesVersion: RULES_VERSION,
      });
    }

    if (Array.isArray(parsed.plates)) {
      const verdict = decide(parsed.plates, { selectedSide, now });
      return json(res, 200, shapeResponse({ parsed, verdict, selectedSide, calendar, now }));
    }

    // No plates: only accept the legacy verdict shape, and only if complete.
    for (const field of ['canPark', 'confidence', 'rawText']) {
      if (!(field in parsed)) {
        return json(res, 502, { error: `Missing field: ${field}` });
      }
    }
    return json(res, 200, shapeLegacy(parsed, calendar, now));
  } catch (err) {
    return json(res, 502, { error: err.message || 'Unexpected error' });
  }
}
