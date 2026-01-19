// sw.js – Fritflix Feedback PWA Service Worker
// Version: v1.4.7
// Pfad: /X9jD7wZq_58Bce29Kqv01P4G38T7L2mFya5Cr0U9N3sZ_LODPEF_defIIEe-2025v3a4x9__safe-zone

const CACHE_NAME = 'fritflix-feedback-v1.4.7';
const BASE_PATH = '/X9jD7wZq_58Bce29Kqv01P4G38T7L2mFya5Cr0U9N3sZ_LODPEF_defIIEe-2025v3a4x9__safe-zone';

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icon-192.png`,
  `${BASE_PATH}/icon-512.png`,
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
];

// INSTALL → Alle wichtigen Dateien vorab cachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('SW: Cache-Add fehlgeschlagen:', err))
  );
  // Kein skipWaiting() → Update erst nach manueller Bestätigung
});

// ACTIVATE → Alte Caches bereinigen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  // Übernimmt alle offenen Tabs sofort
  return self.clients.claim();
});

// FETCH → Strategie: HTML = network-first, alles andere = cache-first
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Nur Anfragen aus unserem BASE_PATH behandeln
  if (!url.pathname.startsWith(BASE_PATH) && !urlsToCache.includes(request.url)) {
    return; // Weitere Verarbeitung überspringen
  }

  // Navigation / HTML-Seiten → Network First (für Updates)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Gültige Antwort → in Cache speichern
          if (networkResponse && networkResponse.status === 200) {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline → aus Cache
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match(`${BASE_PATH}/index.html`);
          });
        })
    );
    return;
  }

  // Statische Assets (JS, CSS, Bilder, EmailJS) → Cache First
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Im Cache? → Sofort zurückgeben
        if (cachedResponse) {
          return cachedResponse;
        }
        // Nicht im Cache → vom Netzwerk holen und cachen
        return fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Bei Offline & nicht im Cache → nichts zurückgeben (fail silently)
          return new Response(null, { status: 404 });
        });
      })
  );
});

// MESSAGE → Ermöglicht manuelles Update (z. B. über Button im UI)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  const title = data.title || 'Fritflix';
  const body  = data.body  || 'Neue Filme oder Serien verfügbar 🎬';
  const url   = data.url   || BASE_PATH + '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: `${BASE_PATH}/icon-192.png`,
      badge: `${BASE_PATH}/icon-192.png`,
      data: { url }
    })
  );
});

// KLICK auf Notification → App öffnen
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || BASE_PATH + '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(BASE_PATH) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});


































