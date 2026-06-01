const CACHE_NAME = 'word-drill-v1';
const ASSETS = [
  '/English_Real/',
  '/English_Real/index.html',
  '/English_Real/favicon.svg',
  '/English_Real/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.url.includes('hf.space') || request.url.includes('api.groq.com')) {
    return;
  }
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

/* Update flow: wait for skipWaiting message from client */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
