// POST /api/push/subscribe   { subscription }  — store or replace this device's subscription
// DELETE /api/push/subscribe                   — remove it and any pending reminders

import { insert, del, isConfigured } from '../_lib/db.js';
import { checkIpLimit } from '../_lib/rateLimit.js';
import { getIp, getDeviceId, hashDeviceId, json } from '../_lib/request.js';
import { isPushConfigured } from '../_lib/push.js';

export function validateSubscription(sub) {
  if (!sub || typeof sub !== 'object') return null;
  const endpoint = typeof sub.endpoint === 'string' ? sub.endpoint : null;
  const p256dh = sub.keys && typeof sub.keys.p256dh === 'string' ? sub.keys.p256dh : null;
  const auth = sub.keys && typeof sub.keys.auth === 'string' ? sub.keys.auth : null;
  if (!endpoint || !/^https:\/\//.test(endpoint) || endpoint.length > 2000 || !p256dh || !auth) return null;
  return { endpoint, keys: { p256dh, auth } };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') return json(res, 405, { error: 'Method not allowed' });

  const rl = checkIpLimit(getIp(req), { name: 'push-subscribe', limit: 20 });
  if (!rl.allowed) return json(res, 429, { error: 'rate_limit', retryAfter: rl.retryAfter }, { 'Retry-After': String(rl.retryAfter) });

  const deviceId = getDeviceId(req);
  if (!deviceId) return json(res, 400, { error: 'device_required' });
  const deviceHash = hashDeviceId(deviceId);

  if (!isConfigured() || !isPushConfigured()) return json(res, 503, { error: 'not_configured' });

  try {
    if (req.method === 'DELETE') {
      await del('reminders', `device_hash=eq.${deviceHash}`);
      await del('push_subscriptions', `device_hash=eq.${deviceHash}`);
      return json(res, 200, { removed: true });
    }

    const sub = validateSubscription(req.body?.subscription);
    if (!sub) return json(res, 400, { error: 'invalid_subscription' });

    // One subscription per device: replace whatever was there.
    await del('push_subscriptions', `device_hash=eq.${deviceHash}`);
    await insert('push_subscriptions', [{
      device_hash: deviceHash,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    }]);
    return json(res, 201, { stored: true });
  } catch (err) {
    console.error('[ParkSense] push subscribe failed:', err.message);
    return json(res, 502, { error: 'store_failed' });
  }
}
