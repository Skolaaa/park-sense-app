// POST /api/subscribe { email, source } — the early-access list.
//
// This is the grandfather offer from docs/PRICING.md: anyone who leaves an
// email before launch keeps Plus free. One row per email; duplicates are
// ignored rather than errored so a second tap is harmless.

import { insert, isConfigured } from './_lib/db.js';
import { checkIpLimit } from './_lib/rateLimit.js';
import { getIp, getDeviceId, hashDeviceId, json } from './_lib/request.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normaliseEmail(raw) {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const rl = checkIpLimit(getIp(req), { name: 'subscribe', limit: 5 });
  if (!rl.allowed) return json(res, 429, { error: 'rate_limit', retryAfter: rl.retryAfter }, { 'Retry-After': String(rl.retryAfter) });

  const email = normaliseEmail(req.body?.email);
  if (!email) return json(res, 400, { error: 'invalid_email' });
  const source = typeof req.body?.source === 'string' ? req.body.source.slice(0, 40) : null;

  if (!isConfigured()) return json(res, 202, { stored: false, reason: 'not_configured' });

  try {
    await insert('subscribers?on_conflict=email', [{ email, source, device_hash: hashDeviceId(getDeviceId(req)) }], {
      prefer: 'return=minimal,resolution=ignore-duplicates',
    });
    return json(res, 202, { stored: true });
  } catch (err) {
    console.error('[ParkSense] subscribe failed:', err.message);
    return json(res, 502, { error: 'store_failed' });
  }
}
