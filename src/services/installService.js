// "Add to home screen". Chrome and Edge fire `beforeinstallprompt`, which we
// capture so the app can offer install at a good moment (after the first
// result) instead of the browser's own timing. iOS has no prompt at all, so
// there we show instructions.

import { Analytics, EVENTS } from './analytics';

let deferredPrompt = null;
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(InstallService.state());
}

export const InstallService = {
  install() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      notify();
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      try { localStorage.setItem('parksense_installed', '1'); } catch { /* ignore */ }
      Analytics.track(EVENTS.APP_INSTALLED);
      notify();
    });
  },

  isStandalone() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  },

  isIos() {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  },

  // 'installed' | 'promptable' | 'ios' | 'unavailable'
  state() {
    if (this.isStandalone()) return 'installed';
    if (deferredPrompt) return 'promptable';
    if (this.isIos()) return 'ios';
    return 'unavailable';
  },

  async prompt() {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return outcome; // 'accepted' | 'dismissed'
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  _resetForTests() {
    deferredPrompt = null;
    listeners.clear();
  },
};
