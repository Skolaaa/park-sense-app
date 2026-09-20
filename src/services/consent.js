// Community data consent. Off until the user turns it on, and the decision
// (either way) is remembered so the card is shown once.

const STORAGE_KEY = 'parksense_community_consent';

export const Consent = {
  // 'granted' | 'declined' | null (never asked)
  get() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'granted' || v === 'declined' ? v : null;
    } catch {
      return null;
    }
  },

  isGranted() {
    return this.get() === 'granted';
  },

  set(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Nothing to do: the choice just will not persist.
    }
  },
};
