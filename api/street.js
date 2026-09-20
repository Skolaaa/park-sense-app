// Street insights — what the community layer gives back.
//
// GET /api/street?lat=-33.88&lon=151.21
//
// Aggregates the opt-in parking events within roughly 150 m of a point and
// returns what parking is like there: the typical posted limit, how often
// the verdict was "no", when people actually park, and — only once there is
// enough data — an activity-by-hour profile that stands in for availability.
//
// Honesty rule: below MIN_SAMPLE the response says there is not enough data
// rather than drawing a chart from three dots. And "availability" is always
// labelled as a proxy: we know when people successfully parked, not how many
// spaces were free.

import { select, isConfigured } from './_lib/db.js';
import { checkIpLimit } from './_lib/rateLimit.js';
import { getIp, json } from './_lib/request.js';

export const MIN_SAMPLE = 5;
export const MIN_SAMPLE_FOR_HOURLY = 30;
const BOX_DEG = 0.0015; // ~165 m of latitude, ~140 m of longitude in Sydney
const MAX_ROWS = 2000;

const mode = (values) => {
  const counts = new Map();
  let best = null;
  for (const v of values) {
    if (v == null) continue;
    const n = (counts.get(v) || 0) + 1;
    counts.set(v, n);
    if (best === null || n > counts.get(best)) best = v;
  }
  return best;
};

// Pure aggregation over rows from parking_events. Exported for tests.
export function summarise(rows, { now = Date.now() } = {}) {
  const scans = rows.filter((r) => r.kind === 'scan');
  const parks = rows.filter((r) => r.kind === 'timer_start');
  const outcomes = rows.filter((r) => r.kind === 'outcome' && r.outcome);

  const sampleSize = scans.length;
  if (sampleSize < MIN_SAMPLE) {
    return { status: 'insufficient_data', sampleSize, minimum: MIN_SAMPLE };
  }

  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, scans: 0, parked: 0, restricted: 0 }));
  for (const r of scans) {
    if (r.local_hour == null) continue;
    byHour[r.local_hour].scans++;
    if (r.can_park === false) byHour[r.local_hour].restricted++;
  }
  for (const r of parks) {
    if (r.local_hour != null) byHour[r.local_hour].parked++;
  }

  const restricted = scans.filter((r) => r.can_park === false).length;
  const limits = scans.filter((r) => r.can_park && r.time_limit_minutes).map((r) => r.time_limit_minutes);
  const durations = rows.filter((r) => r.kind === 'timer_stop' && r.duration_ms > 0).map((r) => r.duration_ms).sort((a, b) => a - b);
  const tickets = outcomes.filter((r) => r.outcome === 'ticket').length;
  const decided = outcomes.filter((r) => r.outcome !== 'unsure').length;

  const busiest = byHour
    .filter((h) => h.parked > 0)
    .sort((a, b) => b.parked - a.parked || a.hour - b.hour)
    .slice(0, 3)
    .map((h) => h.hour);

  const newest = rows.reduce((max, r) => Math.max(max, Date.parse(r.created_at) || 0), 0);

  return {
    status: 'ok',
    sampleSize,
    street: mode(scans.map((r) => r.street)),
    suburb: mode(scans.map((r) => r.suburb)),
    typicalLimitMinutes: mode(limits),
    restrictedShare: sampleSize ? restricted / sampleSize : null,
    parkRate: sampleSize ? parks.length / sampleSize : null,
    medianStayMs: durations.length ? durations[Math.floor(durations.length / 2)] : null,
    ticketRate: decided ? tickets / decided : null,
    outcomesReported: outcomes.length,
    busiestHours: busiest,
    lastSeenMs: newest || null,
    daysOfData: newest ? Math.max(1, Math.round((now - Math.min(...rows.map((r) => Date.parse(r.created_at) || now))) / 86_400_000)) : null,
    // The hourly profile is the seed of "is there parking at 6pm". It is
    // withheld until the sample is large enough that a single evening does
    // not look like a pattern, and it is named for what it is.
    availability: sampleSize >= MIN_SAMPLE_FOR_HOURLY
      ? { status: 'proxy', note: 'Activity by hour from community scans and timers. It shows when people park here, not how many spaces are free.', byHour }
      : { status: 'insufficient_data', minimum: MIN_SAMPLE_FOR_HOURLY },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const rl = checkIpLimit(getIp(req), { name: 'street', limit: 30 });
  if (!rl.allowed) return json(res, 429, { error: 'rate_limit', retryAfter: rl.retryAfter }, { 'Retry-After': String(rl.retryAfter) });

  const lat = Number(req.query?.lat);
  const lon = Number(req.query?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return json(res, 400, { error: 'lat and lon are required' });

  if (!isConfigured()) {
    return json(res, 200, { status: 'not_configured', sampleSize: 0 });
  }

  try {
    const q = [
      `lat=gte.${(lat - BOX_DEG).toFixed(4)}`, `lat=lte.${(lat + BOX_DEG).toFixed(4)}`,
      `lon=gte.${(lon - BOX_DEG).toFixed(4)}`, `lon=lte.${(lon + BOX_DEG).toFixed(4)}`,
      'kind=in.(scan,timer_start,timer_stop,outcome)',
      'select=kind,created_at,street,suburb,can_park,time_limit_minutes,duration_ms,outcome,local_hour',
      'order=created_at.desc',
      `limit=${MAX_ROWS}`,
    ].join('&');
    const rows = await select('parking_events', q);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return json(res, 200, summarise(rows || []));
  } catch (err) {
    console.error('[ParkSense] street query failed:', err.message);
    return json(res, 502, { error: 'query_failed' });
  }
}
