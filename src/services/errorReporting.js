// Client error reporting. Uncaught errors and rejected promises are posted
// to /api/report-error, which logs them server-side and forwards to Sentry
// if configured. No third-party script runs in the browser.

import { Identity } from './identity';
import { APP_CONFIG } from '../utils/constants';

const seen = new Set();
let currentView = 'unknown';

function send(report) {
  try {
    const key = `${report.message}|${(report.stack || '').slice(0, 80)}`;
    if (seen.has(key)) return; // one report per distinct error per page load
    seen.add(key);
    fetch('/api/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...Identity.headers() },
      body: JSON.stringify({
        ...report,
        url: window.location.href,
        userAgent: navigator.userAgent,
        view: currentView,
        release: APP_CONFIG.version,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never throw.
  }
}

export const ErrorReporting = {
  setView(view) {
    currentView = view;
  },

  report(error, context = {}) {
    const err = error instanceof Error ? error : new Error(String(error));
    send({ name: err.name, message: err.message, stack: err.stack, context });
  },

  install() {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (event) => {
      if (event.error) this.report(event.error, { source: 'window.onerror' });
      else if (event.message) send({ name: 'Error', message: event.message, context: { source: 'window.onerror' } });
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.report(event.reason ?? 'Unhandled rejection', { source: 'unhandledrejection' });
    });
  },
};
