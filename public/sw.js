const CACHE_NAME = 'chronoselect-v2';

// This is a basic service worker that enables offline functionality.
// It uses a "cache-first" strategy.

self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // Note: The actual assets (JS/CSS) are dynamically named by the build process.
        // A more advanced service worker would get this list from the build manifest.
        // For now, we'll cache the main entry points.
        return cache.addAll([
          '/',
          '/manifest.json',
        ]);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});


self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        // Return response from cache if found.
        if (response) {
          return response;
        }

        // Otherwise, fetch from network, cache it, and then return it.
        return fetch(event.request).then((networkResponse) => {
          // Check for a valid response
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      }).catch(error => {
        // If both cache and network fail, we can show an offline fallback page.
        // For now, we'll just log the error.
        console.error('Service Worker: Error fetching resource.', error);
        // You could return a fallback page here: return caches.match('/offline.html');
      });
    })
  );
});