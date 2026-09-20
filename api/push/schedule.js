// POST /api/push/schedule  { endsAtMs, warningMs?, label? } — queue the two
//   reminders for a timer: the warning and the expiry.
// DELETE /api/push/schedule — cancel this device's pending reminders.
//
// A device has at most one timer, so scheduling replaces any pending set.

import { insert, isConfigured, del } from '../_lib/db.js';
import { checkIpLimit } from '../_lib/rateLimit.js';
import { getIp, getDeviceId, hashDeviceId, json } from '../_lib/request.js';
import { isPushConfigured } from '../_lib/push.js';

const MAX_AHEAD_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WARNING_MS = 15 * 60 * 1000;

export function buildReminders({ endsAtMs, warningMs = DEFAULT_WARNING_MS, label = null, now = Date.now() }) {
  const ends = Number(endsAtMs);
  if (!Number.isFinite(ends) || ends <= now || ends - now > MAX_AHEAD_MS) return null;
  const warn = Number(warningMs);
  const out = [];
  const where = label ? ` at ${label}` : '';
  if (Number.isFinite(warn) && warn > 0 && ends - warn > now) {
    const mins = Math.round(warn / 60000);
    out.push({
      kind: 'warning',
      fire_at: new Date(ends - warn).toISOString(),
      title: `Parking ends in ${mins} minutes`,
      body: `Your parking${where} runs out at ${clock(ends)}. Head back to the car.`,
    });
  }
  out.push({
    kind: 'expired',
    fire_at: new Date(ends).toISOString(),
    title: 'Parking time is up',
    body: `Your parking${where} has ended. Move the car to avoid a fine.`,
  });
  return out;
}

const clock = (ms) => new Date(ms).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' });

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') return json(res, 405, { error: 'Method not allowed' });

  const rl = checkIpLimit(getIp(req), { name: 'push-schedule', limit: 20 });
  if (!rl.allowed) return json(res, 429, { error: 'rate_limit', retryAfter: rl.retryAfter }, { 'Retry-After': String(rl.retryAfter) });

  const deviceId = getDeviceId(req);
  if (!deviceId) return json(res, 400, { error: 'device_required' });
  const deviceHash = hashDeviceId(deviceId);

  if (!isConfigured() || !isPushConfigured()) return json(res, 503, { error: 'not_configured' });

  try {
    await del('reminders', `device_hash=eq.${deviceHash}`);
    if (req.method === 'DELETE') return json(res, 200, { cancelled: true });

    const reminders = buildReminders({
      endsAtMs: req.body?.endsAtMs,
      warningMs: req.body?.warningMs,
      label: typeof req.body?.label === 'string' ? req.body.label.slice(0, 80) : null,
    });
    if (!reminders) return json(res, 400, { error: 'invalid_schedule' });

    await insert('reminders', reminders.map((r) => ({ ...r, device_hash: deviceHash })));
    return json(res, 201, { scheduled: reminders.length, fireAt: reminders.map((r) => r.fire_at) });
  } catch (err) {
    console.error('[ParkSense] push schedule failed:', err.message);
    return json(res, 502, { error: 'store_failed' });
  }
}
