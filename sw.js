/* CMMS KFMC — Service Worker v1.0 */
  const CACHE_NAME = 'cmms-kfmc-v1';
  const CORE_ASSETS = [
    './login.html',
    './index.html',
    './main.html',
    './tower.html',
    './chiller_colored.html',
    './chilled_water_pumps.html',
    './exhaust_fans.html',
    './package_opd.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './icon.svg'
  ];

  /* ── Install: pre-cache all core pages ─────────────────────────── */
  self.addEventListener('install', event => {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(CORE_ASSETS))
        .then(() => self.skipWaiting())
    );
  });

  /* ── Activate: remove old caches ───────────────────────────────── */
  self.addEventListener('activate', event => {
    event.waitUntil(
      caches.keys()
        .then(keys => Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
        .then(() => self.clients.claim())
    );
  });

  /* ── Fetch: cache-first with network fallback ───────────────────── */
  self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          /* Offline fallback for navigation requests */
          if (event.request.mode === 'navigate') {
            return caches.match('./login.html');
          }
        });
      })
    );
  });
  