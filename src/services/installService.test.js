import { InstallService } from './installService';

beforeEach(() => InstallService._resetForTests());

test('starts unavailable in a plain browser', () => {
  expect(InstallService.state()).toBe('unavailable');
});

test('captures beforeinstallprompt and can prompt', async () => {
  InstallService.install();
  const seen = [];
  InstallService.subscribe((s) => seen.push(s));
  const evt = new Event('beforeinstallprompt');
  evt.prompt = jest.fn();
  evt.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(evt);
  expect(InstallService.state()).toBe('promptable');
  expect(seen).toEqual(['promptable']);
  expect(await InstallService.prompt()).toBe('accepted');
  expect(evt.prompt).toHaveBeenCalled();
  expect(InstallService.state()).toBe('unavailable');
});

test('prompt without a captured event is unavailable', async () => {
  expect(await InstallService.prompt()).toBe('unavailable');
});
