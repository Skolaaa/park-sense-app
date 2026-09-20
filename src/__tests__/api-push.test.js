import { validateSubscription } from '../../api/push/subscribe';
import { buildReminders } from '../../api/push/schedule';
import { plan, isAuthorised } from '../../api/cron/send-reminders';

function makeRes() {
  return {
    _status: 200, _body: null, _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(k, v) { this._headers[k] = v; },
  };
}

const goodSub = { endpoint: 'https://push.example.com/abc', keys: { p256dh: 'p', auth: 'a' } };

describe('validateSubscription', () => {
  test('accepts a well-formed subscription and strips extras', () => {
    expect(validateSubscription({ ...goodSub, expirationTime: null })).toEqual(goodSub);
  });
  test('rejects missing keys or a non-https endpoint', () => {
    expect(validateSubscription({ endpoint: 'http://x', keys: { p256dh: 'p', auth: 'a' } })).toBeNull();
    expect(validateSubscription({ endpoint: 'https://x' })).toBeNull();
    expect(validateSubscription(null)).toBeNull();
  });
});

describe('buildReminders', () => {
  const now = Date.parse('2026-09-15T10:00:00+10:00');
  test('queues a warning and an expiry for a two-hour timer', () => {
    const out = buildReminders({ endsAtMs: now + 2 * 3600_000, now, label: 'Crown St' });
    expect(out).toHaveLength(2);
    expect(out[0].kind).toBe('warning');
    expect(out[0].fire_at).toBe(new Date(now + 2 * 3600_000 - 15 * 60_000).toISOString());
    expect(out[0].title).toBe('Parking ends in 15 minutes');
    expect(out[0].body).toMatch(/at Crown St/);
    expect(out[1].kind).toBe('expired');
    expect(out[1].fire_at).toBe(new Date(now + 2 * 3600_000).toISOString());
  });
  test('skips the warning when the timer is shorter than the warning window', () => {
    const out = buildReminders({ endsAtMs: now + 10 * 60_000, now });
    expect(out.map((r) => r.kind)).toEqual(['expired']);
  });
  test('rejects the past and the far future', () => {
    expect(buildReminders({ endsAtMs: now - 1, now })).toBeNull();
    expect(buildReminders({ endsAtMs: now + 48 * 3600_000, now })).toBeNull();
    expect(buildReminders({ endsAtMs: 'soon', now })).toBeNull();
  });
});

describe('send plan', () => {
  test('matches reminders to subscriptions and reports orphans', () => {
    const due = [{ id: 1, device_hash: 'a' }, { id: 2, device_hash: 'b' }];
    const subs = new Map([['a', { endpoint: 'https://e', p256dh: 'p', auth: 'x' }]]);
    const { sends, orphaned } = plan(due, subs);
    expect(sends).toHaveLength(1);
    expect(sends[0].subscription).toEqual({ endpoint: 'https://e', keys: { p256dh: 'p', auth: 'x' } });
    expect(orphaned).toEqual([2]);
  });
});

describe('cron authorisation', () => {
  afterEach(() => { delete process.env.CRON_SECRET; });
  test('rejects when no secret is configured', () => {
    expect(isAuthorised({ headers: { authorization: 'Bearer x' } })).toBe(false);
  });
  test('requires the exact bearer token', () => {
    process.env.CRON_SECRET = 's3cret';
    expect(isAuthorised({ headers: { authorization: 'Bearer s3cret' } })).toBe(true);
    expect(isAuthorised({ headers: { authorization: 'Bearer nope' } })).toBe(false);
    expect(isAuthorised({ headers: {} })).toBe(false);
  });
});

describe('handlers without configuration', () => {
  const load = (path) => {
    let h;
    jest.isolateModules(() => { ({ default: h } = require(path)); });
    return h;
  };
  const headers = { 'x-forwarded-for': '3.3.3.3', 'x-parksense-device': 'device-abcdef12' };

  test('subscribe returns 503 when push or the database is not configured', async () => {
    const res = makeRes();
    await load('../../api/push/subscribe')({ method: 'POST', headers, body: { subscription: goodSub } }, res);
    expect(res._status).toBe(503);
  });
  test('schedule returns 503 when not configured', async () => {
    const res = makeRes();
    await load('../../api/push/schedule')({ method: 'POST', headers, body: { endsAtMs: Date.now() + 60_000 } }, res);
    expect(res._status).toBe(503);
  });
  test('config reports disabled', async () => {
    const res = makeRes();
    await load('../../api/push/config')({ method: 'GET', headers }, res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ enabled: false, publicKey: null });
  });
  test('cron rejects unauthenticated calls before anything else', async () => {
    const res = makeRes();
    await load('../../api/cron/send-reminders')({ method: 'GET', headers: {} }, res);
    expect(res._status).toBe(401);
  });
  test('subscribe requires a device id', async () => {
    const res = makeRes();
    await load('../../api/push/subscribe')({ method: 'POST', headers: { 'x-forwarded-for': '3.3.3.4' }, body: {} }, res);
    expect(res._status).toBe(400);
  });
});

describe('handlers with configuration', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.VAPID_PUBLIC_KEY = 'pub';
    process.env.VAPID_PRIVATE_KEY = 'priv';
  });
  afterEach(() => {
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY;
    delete global.fetch;
  });
  const load = (path) => {
    let h;
    jest.isolateModules(() => { ({ default: h } = require(path)); });
    return h;
  };
  const headers = { 'x-forwarded-for': '4.4.4.4', 'x-parksense-device': 'device-abcdef12', 'user-agent': 'test' };

  test('subscribe replaces the row for the device', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, text: async () => '' });
    const res = makeRes();
    await load('../../api/push/subscribe')({ method: 'POST', headers, body: { subscription: goodSub } }, res);
    expect(res._status).toBe(201);
    const methods = global.fetch.mock.calls.map(([, init]) => init.method);
    expect(methods).toEqual(['DELETE', 'POST']);
    const inserted = JSON.parse(global.fetch.mock.calls[1][1].body)[0];
    expect(inserted.endpoint).toBe(goodSub.endpoint);
    expect(inserted.device_hash).toHaveLength(32);
  });

  test('schedule clears then inserts the reminders', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, text: async () => '' });
    const res = makeRes();
    await load('../../api/push/schedule')({ method: 'POST', headers, body: { endsAtMs: Date.now() + 2 * 3600_000 } }, res);
    expect(res._status).toBe(201);
    expect(res._body.scheduled).toBe(2);
    const [delUrl, delInit] = global.fetch.mock.calls[0];
    expect(delInit.method).toBe('DELETE');
    expect(delUrl).toMatch(/reminders\?device_hash=eq\./);
  });

  test('config exposes the public key', async () => {
    const res = makeRes();
    await load('../../api/push/config')({ method: 'GET', headers }, res);
    expect(res._body).toEqual({ enabled: true, publicKey: 'pub' });
  });
});
