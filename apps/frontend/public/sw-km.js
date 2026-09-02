const CACHE_KM = 'control-s-km-v7';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_KM).then((cache) => cache.addAll([
      '/KM_Mobile',
      '/manifest-km.webmanifest',
      '/brand/logo-km-192.png',
      '/brand/logo-km-512.png'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave.startsWith('control-s-km-') && chave !== CACHE_KM).map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
