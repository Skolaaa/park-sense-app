import { TimerService } from './timerService';
import { TIMER_CONFIG } from '../utils/constants';

const { STORAGE_KEY } = TIMER_CONFIG;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TimerService.save', () => {
  test('writes startTime and durationMs to localStorage as JSON', () => {
    TimerService.save({ startTime: 1000, durationMs: 5000 });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored).toEqual({ startTime: 1000, durationMs: 5000 });
  });

  test('overwrites any previously saved session', () => {
    TimerService.save({ startTime: 1000, durationMs: 5000 });
    TimerService.save({ startTime: 2000, durationMs: 9000 });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored).toEqual({ startTime: 2000, durationMs: 9000 });
  });
});

describe('TimerService.load', () => {
  test('returns null when nothing is stored', () => {
    expect(TimerService.load()).toBeNull();
  });

  test('returns null and clears storage when the timer has already expired', () => {
    const startTime = Date.now() - 10000;
    const durationMs = 5000; // expired 5s ago
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ startTime, durationMs }));
    expect(TimerService.load()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // Verifies the exact formula: remainingMs = (startTime + durationMs) - Date.now()
  // A loose assertion (> 0 && <= durationMs) would pass even if the formula were wrong.
  test('computes remainingMs as (startTime + durationMs) - Date.now()', () => {
    const fakeNow = 1_000_000;
    const startTime = 900_000;
    const durationMs = 200_000;
    // expected: (900_000 + 200_000) - 1_000_000 = 100_000
    jest.spyOn(Date, 'now').mockReturnValue(fakeNow);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ startTime, durationMs }));
    const session = TimerService.load();

    expect(session.remainingMs).toBe(100_000);
  });

  test('returns startTime and durationMs unchanged from storage', () => {
    const startTime = 500_000;
    const durationMs = 600_000;
    jest.spyOn(Date, 'now').mockReturnValue(startTime); // now = startTime, so remaining = durationMs

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ startTime, durationMs }));
    const session = TimerService.load();

    expect(session.startTime).toBe(startTime);
    expect(session.durationMs).toBe(durationMs);
  });

  test('returns null and clears storage on corrupted localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    expect(TimerService.load()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('TimerService.clear', () => {
  test('removes the item from localStorage', () => {
    TimerService.save({ startTime: Date.now(), durationMs: 5000 });
    TimerService.clear();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('is a no-op when nothing is stored', () => {
    expect(() => TimerService.clear()).not.toThrow();
  });
});
