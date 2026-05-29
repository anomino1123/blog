const CACHE_NAME = 'reporter-periferia-v1';
const urlsToCache = ['', 'index.html', 'login.html', 'register.html', 'perfil.html', 'manifest.json', 'style.css', 'database.js', '/notifications.js', 'auth.js', 'mobile.js', 'app.js'];

self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))); });
self.addEventListener('fetch', event => { event.respondWith(caches.match(event.request).then(response => response || fetch(event.request))); });