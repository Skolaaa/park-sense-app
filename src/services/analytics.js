// Product analytics, deliberately tiny.
//
// If REACT_APP_POSTHOG_PUBLIC_TOKEN is set, events go to PostHog's capture
// endpoint over plain fetch: no SDK, no autocapture, no session recording,
// nothing sent that is not named in a track() call below. The token is
// PostHog's *project* token, which is publishable by design (it can only
// write events) and is allowlisted in scripts/check-bundle-secrets.js.
//
// If it is not set, every call is a no-op, so the app never depends on it.

import { Identity } from './identity';
import { APP_CONFIG } from '../utils/constants';

const TOKEN = process.env.REACT_APP_POSTHOG_PUBLIC_TOKEN || '';
const HOST = (process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');

export const Analytics = {
  enabled: Boolean(TOKEN),

  // Names are stable strings; properties are small and never include the
  // photo, the address, or precise coordinates.
  track(event, properties = {}) {
    if (!this.enabled) return;
    const body = {
      api_key: TOKEN,
      event,
      distinct_id: Identity.getDeviceId(),
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        app_version: APP_CONFIG.version,
        $lib: 'parksense-fetch',
      },
    };
    try {
      const url = `${HOST}/capture/`;
      const payload = JSON.stringify(body);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
      }
    } catch {
      // Analytics must never break the app.
    }
  },
};

// The events the product actually needs, in one place so they cannot drift.
export const EVENTS = {
  SCAN_STARTED: 'scan_started',
  SCAN_COMPLETED: 'scan_completed',
  SCAN_FAILED: 'scan_failed',
  TIMER_STARTED: 'timer_started',
  TIMER_STOPPED: 'timer_stopped',
  OUTCOME_REPORTED: 'outcome_reported',
  FEEDBACK_SENT: 'feedback_sent',
  CONSENT_CHANGED: 'consent_changed',
  RESULT_SHARED: 'result_shared',
  EMAIL_CAPTURED: 'email_captured',
  APP_INSTALLED: 'app_installed',
  REMINDER_SCHEDULED: 'reminder_scheduled',
};
