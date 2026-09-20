import { PushService } from './pushService';

beforeEach(() => PushService._resetForTests());
afterEach(() => { delete global.fetch; });

test('reports unsupported without a service worker or PushManager', async () => {
  expect(PushService.isSupported()).toBe(false);
  expect(await PushService.available()).toBe(false);
  expect(await PushService.scheduleReminders(Date.now() + 1000)).toBe(false);
});

test('config is fetched once and cached', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: true, publicKey: 'k' }) });
  await PushService.config();
  await PushService.config();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('a failed config fetch reads as disabled', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('x'));
  expect(await PushService.config()).toEqual({ enabled: false });
});
