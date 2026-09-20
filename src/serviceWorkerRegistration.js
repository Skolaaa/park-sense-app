// Registers public/sw.js in production builds only. In development the CRA
// dev server would happily serve and cache stale output, which is confusing
// and pointless.
//
// Emits a `parksense:update` event on window when a new version has been
// installed behind a running one, so the app can offer a reload.

export function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production') return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('parksense:update'));
          }
        });
      });
    }).catch((err) => {
      console.warn('[ParkSense] Service worker registration failed:', err);
    });
  });
}
