import { TIMER_CONFIG } from '../utils/constants';

// NOTE: Notifications are scheduled via setTimeout in the main thread.
// When the browser tab is backgrounded on mobile, the OS may suspend the tab
// and the timeout will not fire reliably. Full background notifications require
// a service worker + Push API — deferred to a future phase.

let warningTimeoutId = null;

export const NotificationService = {
  async requestPermission() {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return await Notification.requestPermission();
  },

  // Schedule the 15-minute warning. Call once when the timer starts,
  // passing the full remaining duration in ms.
  scheduleWarning(remainingMs) {
    this.cancelScheduled();
    const msUntilWarning = remainingMs - TIMER_CONFIG.WARNING_THRESHOLD_MS;
    if (msUntilWarning > 0) {
      warningTimeoutId = setTimeout(() => this.sendWarning(), msUntilWarning);
    } else if (remainingMs > 0) {
      // Already inside the warning window — fire immediately.
      this.sendWarning();
    }
  },

  sendWarning() {
    if (Notification.permission !== 'granted') return;
    new Notification('ParkSense — Parking Expiring Soon', {
      body: 'Your parking expires in 15 minutes. Move your vehicle to avoid a fine.',
      icon: '/favicon.ico',
      tag: 'parksense-warning',
    });
  },

  sendExpired() {
    if (Notification.permission !== 'granted') return;
    new Notification('ParkSense — Parking Time Expired', {
      body: 'Your parking time has expired. Move your vehicle now.',
      icon: '/favicon.ico',
      tag: 'parksense-expired',
    });
  },

  cancelScheduled() {
    if (warningTimeoutId !== null) {
      clearTimeout(warningTimeoutId);
      warningTimeoutId = null;
    }
  },
};
