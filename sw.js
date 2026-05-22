/* CMMS KFMC — Service Worker v2.0 */
  const CACHE_NAME = 'cmms-kfmc-v2';
  const CORE_ASSETS = [
    '/PWA/login.html',
    '/PWA/index.html',
    '/PWA/main.html',
    '/PWA/tower.html',
    '/PWA/chiller_colored.html',
    '/PWA/chilled_water_pumps.html',
    '/PWA/exhaust_fans.html',
    '/PWA/package_opd.html',
    '/PWA/manifest.json',
    '/PWA/icon-192.png',
    '/PWA/icon-512.png',
    '/PWA/icon.svg'
  ];

  /* ── Install: cache each asset individually so one failure can't block install */
  self.addEventListener('install', event => {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache =>
        Promise.allSettled(
          CORE_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Failed to cache', url, err))
          )
        )
      ).then(() => self.skipWaiting())
    );
  });

  /* ── Activate: delete old caches ─────────────────────────────────────────── */
  self.addEventListener('activate', event => {
    event.waitUntil(
      caches.keys()
        .then(keys => Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
        .then(() => self.clients.claim())
    );
  });

  /* ── Fetch: network-first for HTML pages, cache-first for assets ─────────── */
  self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');

    if (isHTML) {
      /* Network-first: always try fresh HTML, fall back to cache */
      event.respondWith(
        fetch(event.request)
          .then(res => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
            }
            return res;
          })
          .catch(() => caches.match(event.request)
            .then(cached => cached || caches.match('/PWA/login.html')))
      );
    } else {
      /* Cache-first for images, icons, manifest */
      event.respondWith(
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(res => {
            if (res && res.status === 200 && res.type !== 'opaque') {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
            }
            return res;
          }).catch(() => cached);
        })
      );
    }
  });
  