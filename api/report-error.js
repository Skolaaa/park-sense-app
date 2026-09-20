// Client error intake.
//
// The browser posts uncaught errors here. They are written to the function
// log (visible in the Vercel dashboard) and, if SENTRY_DSN is set, forwarded
// to Sentry with a hand-built envelope so the client bundle does not need
// the Sentry SDK. Server-side errors log directly and never come through
// this route.

import { checkIpLimit } from './_lib/rateLimit.js';
import { getIp, getDeviceId, hashDeviceId, json } from './_lib/request.js';
import { randomUUID } from 'node:crypto';

const cut = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);

export function parseDsn(dsn) {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, '');
    if (!u.username || !projectId) return null;
    return { key: u.username, host: u.host, projectId, protocol: u.protocol };
  } catch {
    return null;
  }
}

export function buildSentryEvent(report, { release, deviceHash }) {
  return {
    event_id: randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level: 'error',
    logger: 'parksense-client',
    release,
    message: report.message,
    exception: { values: [{ type: report.name || 'Error', value: report.message, stacktrace: undefined }] },
    extra: { stack: report.stack, context: report.context },
    request: { url: report.url, headers: { 'User-Agent': report.userAgent } },
    tags: { view: report.view || 'unknown' },
    user: deviceHash ? { id: deviceHash } : undefined,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const rl = checkIpLimit(getIp(req), { name: 'report-error', limit: 20 });
  if (!rl.allowed) return json(res, 429, { error: 'rate_limit', retryAfter: rl.retryAfter }, { 'Retry-After': String(rl.retryAfter) });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const report = {
    name: cut(body.name, 100),
    message: cut(body.message, 1000) || 'Unknown error',
    stack: cut(body.stack, 4000),
    url: cut(body.url, 500),
    userAgent: cut(body.userAgent, 300),
    view: cut(body.view, 50),
    context: body.context && typeof body.context === 'object' ? JSON.parse(JSON.stringify(body.context).slice(0, 2000)) : undefined,
    release: cut(body.release, 50),
  };

  const deviceHash = hashDeviceId(getDeviceId(req));
  console.error('[ParkSense client error]', JSON.stringify({ ...report, deviceHash }));

  const dsn = process.env.SENTRY_DSN ? parseDsn(process.env.SENTRY_DSN) : null;
  if (dsn) {
    try {
      await fetch(`${dsn.protocol}//${dsn.host}/api/${dsn.projectId}/store/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=parksense-proxy/1.0`,
        },
        body: JSON.stringify(buildSentryEvent(report, { release: report.release, deviceHash })),
      });
    } catch (err) {
      console.error('[ParkSense] Sentry forward failed:', err.message);
    }
  }

  return json(res, 202, { received: true, forwarded: Boolean(dsn) });
}
