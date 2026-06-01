// BarberQueue service worker.
// Strategy: cache-first for Next.js static assets (content-hashed, safe forever).
//            network-only for everything else (pages, API, Supabase).
const CACHE = 'bq-static-v1';
const STATIC_RE = /\/_next\/static\//;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only cache same-origin Next.js static assets (content-hashed — safe forever).
  if (url.origin === location.origin && STATIC_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ??
          fetch(event.request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(event.request, clone));
            }
            return res;
          })
      )
    );
  }
  // All other requests (pages, API, Supabase) — network only, no caching.
});
