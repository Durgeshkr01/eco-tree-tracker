// Service Worker for PWA
const CACHE_NAME = 'ecotree-tracker-v2';
const BASE_PATH = '/eco-tree-tracker/';
const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'styles.css',
  BASE_PATH + 'app.js',
  BASE_PATH + 'calculator.js',
  BASE_PATH + 'tree-data.js',
  BASE_PATH + 'firebase-config.js',
  BASE_PATH + 'logo.svg',
  BASE_PATH + 'favicon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Install event - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Immediately take control of all pages
  return self.clients.claim();
});
