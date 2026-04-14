// Portafoglio Personale — Service Worker
const CACHE_NAME = 'portafoglio-v5';
const CACHE_URLS = [
  '/PortafoglioPersonale/',
  '/PortafoglioPersonale/index.html',
  '/PortafoglioPersonale/css/style.css',
  '/PortafoglioPersonale/js/app.js',
  '/PortafoglioPersonale/js/auth.js',
  '/PortafoglioPersonale/js/drive.js',
  '/PortafoglioPersonale/js/quotes.js',
  '/PortafoglioPersonale/js/portfolio.js',
  '/PortafoglioPersonale/js/charts.js',
  '/PortafoglioPersonale/manifest.json',
  // Font
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  // Bootstrap Icons
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  // Chart.js
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  // SheetJS
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
];

// Install — precache assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(CACHE_URLS.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

// Activate — pulizia cache vecchie
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — strategia: Cache First per assets locali, Network First per API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ignora richieste non GET
  if (e.request.method !== 'GET') return;

  // Ignora schemi non supportati (chrome-extension, etc.)
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // Ignora Google APIs e Drive (sempre network)
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('accounts.google.com')) {
    return;
  }

  // Network First per le quotazioni (Cloudflare Worker)
  if (url.hostname.includes('workers.dev')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache First per tutti gli altri asset
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});

// Background sync per aggiornamento quotazioni
self.addEventListener('sync', e => {
  if (e.tag === 'sync-quotes') {
    e.waitUntil(syncQuotes());
  }
});

async function syncQuotes() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_QUOTES' }));
}

// Push notifications (future use)
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  self.registration.showNotification(data.title || 'Portafoglio Personale', {
    body: data.body || '',
    icon: '/PortafoglioPersonale/icons/icon-192.png',
    badge: '/PortafoglioPersonale/icons/icon-72.png',
  });
});
