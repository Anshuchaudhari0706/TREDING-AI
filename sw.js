const CACHE_NAME = 'nexustrade-ai-v1';
const urlsToCache = [
  './index.html',
  './index.css',
  './app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Bypass caching for API calls to the python backend and binance API!
  if (event.request.url.includes('/api/') || event.request.url.includes('binance.com')) {
      return; 
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Return from cache if found
        }
        return fetch(event.request); // Otherwise fetch from network
      }
    )
  );
});
