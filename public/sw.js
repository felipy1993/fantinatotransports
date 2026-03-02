const CACHE_NAME = 'prateado-transporte-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dist/bundle.js',
  './assets/logo.png',
  './manifest.json',
  './runtime-config.js'
];

// Instalação do Service Worker e cache de assets básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache aberto');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  // Não interceptar chamadas de API (PocketBase/Backend) ou serviços externos
  if (
    event.request.url.includes('sistemac.fs-sistema.cloud') || 
    event.request.url.includes('openstreetmap.org') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retorna do cache se existir, senão busca na rede
      return response || fetch(event.request).then(fetchRes => {
        // Opcional: Adicionar novos assets ao cache dinamicamente
        return fetchRes;
      });
    }).catch(() => {
      // Fallback offline se necessário
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});

