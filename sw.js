const VERSION = 'v20';
const ORIGIN = self.location.origin;
const CACHE_STATIC = `ct-gnv-pro-${VERSION}-static`;
const CACHE_HTML = `ct-gnv-pro-${VERSION}-html`;
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './icon-192.png',
  './icon-512.png',
  './assets/styles.css',
  './assets/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
    } catch (e) {}
    const cache = await caches.open(CACHE_STATIC);
    await cache.addAll(PRECACHE);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (!k.includes(VERSION) ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

function isSameOrigin(req) {
  try {
    return new URL(req.url).origin === ORIGIN;
  } catch {
    return false;
  }
}

function isStatic(req) {
  return /\.(?:css|js|png|svg|ico|webmanifest)(\?|$)/i.test(req.url);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) {
          const cache = await caches.open(CACHE_HTML);
          cache.put(request, preload.clone());
          return preload;
        }
        const net = await fetch(request);
        const cache = await caches.open(CACHE_HTML);
        cache.put(request, net.clone());
        return net;
      } catch {
        const cache = await caches.open(CACHE_HTML);
        const cached = await cache.match(request) || await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  if (isSameOrigin(request) && isStatic(request)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_STATIC);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((net) => {
        cache.put(request, net.clone());
        return net;
      }).catch(() => undefined);
      return cached || fetchPromise || fetch(request);
    })());
  }
});

self.addEventListener('message', (event) => {
  if (event && event.data === 'SKIP_WAITING') self.skipWaiting();
});
