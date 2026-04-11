const CACHE_NAME = 'portafoglio-v17';

const ASSETS = [
  '/portafoglio-/',
  '/portafoglio-/index.html',
  '/portafoglio-/manifest.json',
  '/portafoglio-/config.js',
  '/portafoglio-/auth.js',
  '/portafoglio-/drive.js',
  '/portafoglio-/prezzi.js',
  '/portafoglio-/app.js',
  '/portafoglio-/import.js',
  '/portafoglio-/wallet.js',
  '/portafoglio-/icon-192.png',
  '/portafoglio-/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('workers.dev') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('accounts.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
