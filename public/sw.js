const CACHE_NAME = 'central-truck-v' + new Date().getTime();
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'dist/bundle.js',
  'assets/logo.png',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar chamadas de API externas para evitar problemas de CORS/Cache
  if (event.request.url.includes('sistemac.fs-sistema.cloud')) {
    return;
  }

  // Apenas interceptar GET requests para o próprio domínio
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
