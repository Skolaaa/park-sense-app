// Remembers a parking session so that, after it ends, the app can ask one
// question: did you get a ticket? The answer is the only ground truth this
// product can collect about its own accuracy.

const STORAGE_KEY = 'parksense_pending_outcome';

export const OutcomeService = {
  // Called when a timer starts. Keeps just enough to attribute the answer.
  begin(result, durationMs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        startedAt: Date.now(),
        durationMs,
        endedAt: null,
        kind: result?.kind ?? null,
        timeLimitMinutes: result?.timeLimitMinutes ?? null,
        location: result?.location ?? null,
        rawText: result?.rawText ?? null,
      }));
    } catch {
      // Without storage there is nothing to ask later.
    }
  },

  // Called when the timer stops or expires.
  end() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s.endedAt) {
        s.endedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      }
    } catch {
      // ignore
    }
  },

  // The session to ask about, or null. Asks only after the session has
  // ended, and gives up after three days so a stale question never surfaces.
  pending() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const ended = s.endedAt ?? (s.startedAt + s.durationMs <= Date.now() ? s.startedAt + s.durationMs : null);
      if (!ended) return null;
      if (Date.now() - ended > 3 * 24 * 60 * 60 * 1000) {
        this.clear();
        return null;
      }
      return { ...s, endedAt: ended };
    } catch {
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
