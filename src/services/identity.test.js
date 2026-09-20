import { Identity } from './identity';

beforeEach(() => localStorage.clear());

test('creates an id once and reuses it', () => {
  const a = Identity.getDeviceId();
  const b = Identity.getDeviceId();
  expect(a).toBe(b);
  expect(a).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  expect(localStorage.getItem('parksense_device')).toBe(a);
});

test('replaces a corrupted stored id', () => {
  localStorage.setItem('parksense_device', 'bad id with spaces');
  expect(Identity.getDeviceId()).not.toBe('bad id with spaces');
});

test('headers() carries the id under the expected name', () => {
  expect(Identity.headers()).toEqual({ 'x-parksense-device': Identity.getDeviceId() });
});
