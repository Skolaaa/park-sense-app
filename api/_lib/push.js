// Web Push, server side. Thin wrapper over the `web-push` package so the
// endpoints stay small and the VAPID configuration lives in one place.
//
// Generate keys once with `npx web-push generate-vapid-keys` and set:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com)

import webpush from 'web-push';

let configured = false;

export function pushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@parksense.app';
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function isPushConfigured() {
  return pushConfig() !== null;
}

function ensureConfigured() {
  const cfg = pushConfig();
  if (!cfg) throw new Error('push_not_configured');
  if (!configured) {
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    configured = true;
  }
}

// Returns { ok: true } or { ok: false, gone: boolean, error }. `gone` means
// the subscription is dead (404/410) and should be deleted.
export async function sendPush(subscription, payload, { ttl = 3600 } = {}) {
  ensureConfigured();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: ttl, urgency: 'high' });
    return { ok: true };
  } catch (err) {
    const status = err?.statusCode;
    return { ok: false, gone: status === 404 || status === 410, error: err?.message || String(err) };
  }
}

export function _resetPushForTests() {
  configured = false;
}
