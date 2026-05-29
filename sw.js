const CACHE_NAME = 'reporter-periferia-v1';
const urlsToCache = ['/', '/index.html', '/login.html', '/register.html', '/perfil.html', '/manifest.json', '/css/style.css', '/js/database.js', '/js/notifications.js', '/js/auth.js', '/js/mobile.js', '/js/app.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});