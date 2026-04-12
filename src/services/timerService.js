import { TIMER_CONFIG } from '../utils/constants';

const { STORAGE_KEY } = TIMER_CONFIG;

export const TimerService = {
  save({ startTime, durationMs }) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ startTime, durationMs }));
  },

  // Returns { startTime, durationMs, remainingMs } or null if no active session.
  // remainingMs is always computed fresh so page refreshes don't cause drift.
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const { startTime, durationMs } = JSON.parse(raw);
      const remainingMs = (startTime + durationMs) - Date.now();
      if (remainingMs <= 0) {
        this.clear();
        return null;
      }
      return { startTime, durationMs, remainingMs };
    } catch {
      this.clear();
      return null;
    }
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
