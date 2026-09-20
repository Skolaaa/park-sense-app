import { OutcomeService } from './outcomeService';

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-15T10:00:00+10:00'));
});
afterEach(() => jest.useRealTimers());

const result = { kind: 'time_limited', timeLimitMinutes: 120, rawText: '2P', location: { lat: -33.88, lon: 151.21, address: 'Crown St' } };

test('nothing is pending before a session ends', () => {
  OutcomeService.begin(result, 60 * 60_000);
  expect(OutcomeService.pending()).toBeNull();
});

test('a stopped session becomes pending', () => {
  OutcomeService.begin(result, 60 * 60_000);
  jest.setSystemTime(new Date('2026-09-15T10:30:00+10:00'));
  OutcomeService.end();
  const p = OutcomeService.pending();
  expect(p).not.toBeNull();
  expect(p.kind).toBe('time_limited');
  expect(p.location.lat).toBe(-33.88);
  expect(p.rawText).toBe('2P');
});

test('a session that ran out becomes pending on its own', () => {
  OutcomeService.begin(result, 60 * 60_000);
  jest.setSystemTime(new Date('2026-09-15T11:01:00+10:00'));
  expect(OutcomeService.pending()).not.toBeNull();
});

test('a stale question is dropped after three days', () => {
  OutcomeService.begin(result, 60 * 60_000);
  OutcomeService.end();
  jest.setSystemTime(new Date('2026-09-19T10:00:00+10:00'));
  expect(OutcomeService.pending()).toBeNull();
  expect(localStorage.getItem('parksense_pending_outcome')).toBeNull();
});

test('clear removes it', () => {
  OutcomeService.begin(result, 1000);
  OutcomeService.end();
  OutcomeService.clear();
  expect(OutcomeService.pending()).toBeNull();
});
