const CACHE_NAME = 'fritflix-feedback-v1.1.0';

const BASE_PATH = '/X9jD7wZq_58Bce29Kqv01P4G38T7L2mFya5Cr0U9N3sZ_LODPEF_defIIEe-2025v3a4x9__safe-zone';

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icon-192.png`,
  `${BASE_PATH}/icon-512.png`,
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
];

// INSTALL → Dateien vorcachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  // WICHTIG: NICHT automatisch skipWaiting → Update erst nach User-OK
});

// ACTIVATE → alte Caches löschen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// FETCH → HTML: network-first, Rest: cache-first
self.addEventListener('fetch', event => {
  const req = event.request;

  // Navigation / HTML → network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          // frische index.html in Cache legen
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        })
        .catch(() => caches.match(req)) // offline: aus Cache
    );
    return;
  }

  // alles andere → cache-first
  event.respondWith(
    caches.match(req)
      .then(cacheRes => cacheRes || fetch(req))
  );
});

// MESSAGE → kommt vom Client, um Update sofort zu aktivieren
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
