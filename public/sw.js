/* eslint-disable no-restricted-globals */
// ParkSense service worker.
//
// Three jobs, kept deliberately small:
//   1. Make the app installable and usable offline: precache the built shell
//      from asset-manifest.json, serve navigations network-first with the
//      cached shell as fallback, and hashed assets cache-first.
//   2. Show push notifications for parking reminders when the tab is closed.
//   3. Open the app when a notification is tapped.
//
// /api/* is never cached or intercepted.

const SHELL_CACHE = 'parksense-shell';
const SHELL_URLS = ['/', '/index.html', '/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png'];

async function manifestAssets() {
  try {
    const res = await fetch('/asset-manifest.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const manifest = await res.json();
    return Object.values(manifest.files || {}).filter((u) => /\.(js|css)$/.test(u) && !/\.map$/.test(u));
  } catch {
    return [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const assets = await manifestAssets();
    await Promise.all([...SHELL_URLS, ...assets].map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop hashed assets that are no longer in the manifest.
    const cache = await caches.open(SHELL_CACHE);
    const keep = new Set([...SHELL_URLS, ...(await manifestAssets())].map((u) => new URL(u, self.location.origin).href));
    for (const req of await cache.keys()) {
      if (!keep.has(req.url)) await cache.delete(req);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put('/index.html', fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fresh = await fetch(request);
    if (fresh.ok && /\/static\//.test(url.pathname)) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  })());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'ParkSense', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'ParkSense';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'parksense',
    renotify: true,
    requireInteraction: data.kind === 'expired',
    data: { url: data.url || '/' },
    vibrate: data.kind === 'expired' ? [200, 100, 200, 100, 200] : [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) {
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
