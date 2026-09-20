import { ShareService, shareText } from './shareService';

const result = { canPark: true, timeLimit: '2 hours', rawText: '2P 8AM-6PM', location: { address: '12, Crown Street, Surry Hills, Sydney' } };

afterEach(() => {
  delete navigator.share;
  delete navigator.clipboard;
});

test('shareText reads as a sentence with the street and the sign', () => {
  const t = shareText(result);
  expect(t).toMatch(/you can park for 2 hours at 12, Crown Street/);
  expect(t).toMatch(/Sign: “2P 8AM-6PM”/);
  expect(shareText({ canPark: false })).toMatch(/no parking right now/);
});

test('uses the share sheet when available', async () => {
  navigator.share = jest.fn().mockResolvedValue();
  expect(await ShareService.share(result)).toBe('shared');
  expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({ title: 'ParkSense' }));
});

test('closing the sheet is not an error', async () => {
  navigator.share = jest.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
  expect(await ShareService.share(result)).toBe('shared');
});

test('falls back to the clipboard', async () => {
  navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };
  expect(await ShareService.share(result)).toBe('copied');
});

test('reports unavailable when neither exists', async () => {
  expect(await ShareService.share(result)).toBe('unavailable');
});
