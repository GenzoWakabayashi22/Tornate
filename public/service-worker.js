// Service Worker per Tornate Loggia Kilwinning
// Gestisce caching e funzionalità offline

const CACHE_NAME = 'tornate-v1.0.0';
const RUNTIME_CACHE = 'tornate-runtime';

// File essenziali da cachare all'installazione
const PRECACHE_URLS = [
  '/',
  '/fratelli/login',
  '/admin',
  '/css/style.css',
  '/js/session-keeper.js',
  '/js/error-manager.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json'
];

// Installazione: precache dei file essenziali
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installazione in corso...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching file essenziali');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Attivazione: pulizia cache vecchie
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Attivazione in corso...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Rimozione cache obsoleta:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: strategia di caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora richieste non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignora richieste a domini esterni (tranne le API del backend)
  if (url.origin !== location.origin) {
    return;
  }

  // Strategia per API: Network First, poi Cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request)
    );
    return;
  }

  // Strategia per asset statici: Cache First, poi Network
  if (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/')
  ) {
    event.respondWith(
      cacheFirstStrategy(request)
    );
    return;
  }

  // Strategia per pagine HTML: Network First, poi Cache
  event.respondWith(
    networkFirstStrategy(request)
  );
});

// Network First Strategy: prova rete, poi cache
async function networkFirstStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const networkResponse = await fetch(request);

    // Se la risposta è valida, aggiorna la cache
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network fallito, uso cache:', request.url);

    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Se non c'è cache, restituisci pagina offline (opzionale)
    if (request.destination === 'document') {
      return cache.match('/') || new Response(
        '<html><body><h1>Offline</h1><p>Connessione non disponibile</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response('Network error', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Cache First Strategy: usa cache, poi rete
async function cacheFirstStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Restituisci cache e aggiorna in background
    fetchAndUpdateCache(request, cache);
    return cachedResponse;
  }

  // Nessuna cache, scarica da rete
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch fallito:', error);
    return new Response('Network error', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Aggiorna cache in background
async function fetchAndUpdateCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Ignora errori in background update
  }
}

// Gestione messaggi dal client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});
