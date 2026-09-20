import { normaliseEmail } from '../../api/subscribe';

function makeRes() {
  return {
    _status: 200, _body: null, _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(k, v) { this._headers[k] = v; },
  };
}
const load = () => { let h; jest.isolateModules(() => { ({ default: h } = require('../../api/subscribe')); }); return h; };

test('normaliseEmail lower-cases and validates', () => {
  expect(normaliseEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  expect(normaliseEmail('nope')).toBeNull();
  expect(normaliseEmail('a@b')).toBeNull();
  expect(normaliseEmail(42)).toBeNull();
});

test('rejects a bad email with 400', async () => {
  const res = makeRes();
  await load()({ method: 'POST', headers: { 'x-forwarded-for': '8.8.8.1' }, body: { email: 'x' } }, res);
  expect(res._status).toBe(400);
});

test('acknowledges without storing when no database is configured', async () => {
  const res = makeRes();
  await load()({ method: 'POST', headers: { 'x-forwarded-for': '8.8.8.2' }, body: { email: 'a@b.co' } }, res);
  expect(res._status).toBe(202);
  expect(res._body.stored).toBe(false);
});

test('stores with duplicate resolution when configured', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 201, text: async () => '' });
  const res = makeRes();
  await load()({ method: 'POST', headers: { 'x-forwarded-for': '8.8.8.3', 'x-parksense-device': 'device-abcdef12' }, body: { email: 'A@B.co', source: 'home' } }, res);
  expect(res._status).toBe(202);
  const [url, init] = global.fetch.mock.calls[0];
  expect(url).toMatch(/subscribers\?on_conflict=email$/);
  expect(init.headers.Prefer).toMatch(/ignore-duplicates/);
  expect(JSON.parse(init.body)[0].email).toBe('a@b.co');
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; delete global.fetch;
});

test('rate limits sign-ups tightly', async () => {
  const handler = load();
  for (let i = 0; i < 5; i++) await handler({ method: 'POST', headers: { 'x-forwarded-for': '8.8.8.4' }, body: { email: 'a@b.co' } }, makeRes());
  const res = makeRes();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '8.8.8.4' }, body: { email: 'a@b.co' } }, res);
  expect(res._status).toBe(429);
});
