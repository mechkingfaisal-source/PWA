/* CMMS KFMC — Service Worker v3.0 */
  const CACHE_NAME = 'cmms-kfmc-v3';
  const CORE_ASSETS = [
    '/PWA/',
    '/PWA/login.html',
    '/PWA/index.html',
    '/PWA/main.html',
    '/PWA/tower.html',
    '/PWA/chiller_colored.html',
    '/PWA/chilled_water_pumps.html',
    '/PWA/exhaust_fans.html',
    '/PWA/package_opd.html',
    '/PWA/material_request.html',
    '/PWA/engineer_approval.html',
    '/PWA/warehouse.html',
    '/PWA/manifest.json',
    '/PWA/icons/icon-144x144.png',
    '/PWA/icons/icon-192x192.png',
    '/PWA/icons/icon-512x512.png',
    /* Firebase SDK — compat (used by main/tower/exhaust_fans/chiller/pumps/package_opd/material_request/engineer_approval/warehouse) */
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
    /* Firebase SDK — ES modules (used by index.html) */
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
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

  /* ── Fetch: network-first for HTML pages, cache-first for everything else ── */
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
      /* Cache-first for JS/CSS/images/manifest — including Firebase SDK */
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
