// The early-access list, client side. Remembers that this device signed up
// so the offer is shown once and the settings screen can say "you're in".

import { Identity } from './identity';
import { Analytics, EVENTS } from './analytics';

const STORAGE_KEY = 'parksense_early_access';

export const EarlyAccessService = {
  status() {
    try {
      return localStorage.getItem(STORAGE_KEY); // 'joined' | 'dismissed' | null
    } catch {
      return null;
    }
  },

  set(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
  },

  async join(email, source = 'app') {
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...Identity.headers() },
        body: JSON.stringify({ email, source }),
      });
      if (res.status === 400) return { ok: false, reason: 'invalid_email' };
      if (!res.ok) return { ok: false, reason: 'failed' };
      this.set('joined');
      Analytics.track(EVENTS.EMAIL_CAPTURED, { source });
      return { ok: true };
    } catch {
      return { ok: false, reason: 'failed' };
    }
  },
};
