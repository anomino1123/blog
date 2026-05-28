// ============================================
// REPÓRTER DA PERIFERIA - SERVICE WORKER
// Permite instalação como app e funciona offline
// ============================================

const CACHE_NAME = 'reporter-periferia-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/perfil.html',
  '/manifest.json',
  '/css/style.css',
  '/js/database.js',
  '/js/notifications.js',
  '/js/auth.js',
  '/js/app.js'
];

// Instalação - adiciona arquivos ao cache
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercepta requisições - responde do cache quando offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});

// Notificações push (para quando tiver)
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'Ver agora', icon: '/icons/icon-72.png' },
      { action: 'close', title: 'Fechar', icon: '/icons/icon-72.png' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification('Repórter da Periferia', options)
  );
});