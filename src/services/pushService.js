// Web Push on the client. Subscribes this browser to the push service and
// asks the server to queue the timer's reminders, which are then delivered
// whether or not the tab is open. Falls back silently: when push is not
// available the in-page setTimeout reminder in NotificationService still runs.

import { Identity } from './identity';

let configPromise = null;

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const headers = () => ({ 'Content-Type': 'application/json', ...Identity.headers() });

export const PushService = {
  isSupported() {
    return typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;
  },

  // { enabled, publicKey } from the server, cached for the page's life.
  async config() {
    if (!configPromise) {
      configPromise = fetch('/api/push/config').then((r) => (r.ok ? r.json() : { enabled: false })).catch(() => ({ enabled: false }));
    }
    return configPromise;
  },

  async available() {
    if (!this.isSupported()) return false;
    const cfg = await this.config();
    return Boolean(cfg.enabled);
  },

  // Returns the subscription, creating and registering it if needed, or
  // null when push is unavailable or permission is not granted.
  async subscribe() {
    if (!(await this.available())) return null;
    if (Notification.permission !== 'granted') return null;
    try {
      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        const { publicKey } = await this.config();
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      const res = await fetch('/api/push/subscribe', { method: 'POST', headers: headers(), body: JSON.stringify({ subscription: sub.toJSON() }) });
      return res.ok ? sub : null;
    } catch {
      return null;
    }
  },

  // Queue the warning and expiry reminders for a timer ending at `endsAtMs`.
  // Resolves true when the server accepted them.
  async scheduleReminders(endsAtMs, { warningMs, label } = {}) {
    const sub = await this.subscribe();
    if (!sub) return false;
    try {
      const res = await fetch('/api/push/schedule', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ endsAtMs, warningMs, label }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async cancelReminders() {
    if (!(await this.available())) return false;
    try {
      const res = await fetch('/api/push/schedule', { method: 'DELETE', headers: headers() });
      return res.ok;
    } catch {
      return false;
    }
  },

  async unsubscribe() {
    if (!this.isSupported()) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch('/api/push/subscribe', { method: 'DELETE', headers: headers() });
    } catch {
      // nothing to do
    }
  },

  _resetForTests() {
    configPromise = null;
  },
};
