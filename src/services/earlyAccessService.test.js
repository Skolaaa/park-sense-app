import { EarlyAccessService } from './earlyAccessService';

beforeEach(() => { localStorage.clear(); });
afterEach(() => { delete global.fetch; });

test('joining stores the email server-side and remembers it locally', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 202 });
  const r = await EarlyAccessService.join('Someone@Example.com', 'home');
  expect(r.ok).toBe(true);
  expect(EarlyAccessService.status()).toBe('joined');
  const [url, init] = global.fetch.mock.calls[0];
  expect(url).toBe('/api/subscribe');
  expect(JSON.parse(init.body)).toEqual({ email: 'Someone@Example.com', source: 'home' });
  expect(init.headers['x-parksense-device']).toBeDefined();
});

test('an invalid email is reported and not remembered', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 });
  expect(await EarlyAccessService.join('nope')).toEqual({ ok: false, reason: 'invalid_email' });
  expect(EarlyAccessService.status()).toBeNull();
});

test('a network failure is reported', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
  expect(await EarlyAccessService.join('a@b.co')).toEqual({ ok: false, reason: 'failed' });
});
