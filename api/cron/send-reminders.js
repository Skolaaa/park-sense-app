// GET /api/cron/send-reminders — deliver every reminder that is due.
//
// Called once a minute. Authenticated with CRON_SECRET, which Vercel Cron
// sends as `Authorization: Bearer <secret>`; an external pinger (Supabase
// pg_cron, cron-job.org) must send the same header. See
// supabase/migrations/0002_push.sql for the pg_cron option.

import { select, del, update, isConfigured } from '../_lib/db.js';
import { json } from '../_lib/request.js';
import { sendPush, isPushConfigured } from '../_lib/push.js';

const BATCH = 200;

export function isAuthorised(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers?.authorization || '';
  return header === `Bearer ${secret}`;
}

// Pure: given due reminders and the subscriptions keyed by device hash,
// returns the send plan. Exported for tests.
export function plan(due, subsByDevice) {
  const sends = [];
  const orphaned = [];
  for (const r of due) {
    const sub = subsByDevice.get(r.device_hash);
    if (!sub) { orphaned.push(r.id); continue; }
    sends.push({ reminder: r, subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } });
  }
  return { sends, orphaned };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!isAuthorised(req)) return json(res, 401, { error: 'unauthorised' });
  if (!isConfigured() || !isPushConfigured()) return json(res, 503, { error: 'not_configured' });

  const nowIso = new Date().toISOString();
  try {
    const due = await select('reminders', `fire_at=lte.${encodeURIComponent(nowIso)}&sent_at=is.null&order=fire_at.asc&limit=${BATCH}`) || [];
    if (due.length === 0) return json(res, 200, { due: 0, sent: 0 });

    const hashes = [...new Set(due.map((r) => r.device_hash))];
    const subs = await select('push_subscriptions', `device_hash=in.(${hashes.join(',')})`) || [];
    const subsByDevice = new Map(subs.map((s) => [s.device_hash, s]));
    const { sends, orphaned } = plan(due, subsByDevice);

    let sent = 0, failed = 0, gone = 0;
    for (const { reminder, subscription } of sends) {
      const result = await sendPush(subscription, {
        title: reminder.title, body: reminder.body, kind: reminder.kind, tag: `parksense-${reminder.kind}`, url: '/',
      });
      if (result.ok) {
        sent++;
        await update('reminders', `id=eq.${reminder.id}`, { sent_at: nowIso });
      } else if (result.gone) {
        gone++;
        await del('push_subscriptions', `device_hash=eq.${reminder.device_hash}`);
        await del('reminders', `device_hash=eq.${reminder.device_hash}`);
      } else {
        failed++;
        await update('reminders', `id=eq.${reminder.id}`, { attempts: (reminder.attempts || 0) + 1, last_error: String(result.error).slice(0, 200) });
      }
    }
    if (orphaned.length) await del('reminders', `id=in.(${orphaned.join(',')})`);

    // Anything more than a day overdue is noise, not a reminder.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await del('reminders', `fire_at=lt.${encodeURIComponent(cutoff)}`);

    return json(res, 200, { due: due.length, sent, failed, gone, orphaned: orphaned.length });
  } catch (err) {
    console.error('[ParkSense] send-reminders failed:', err.message);
    return json(res, 502, { error: 'send_failed' });
  }
}
