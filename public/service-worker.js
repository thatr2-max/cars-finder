/**
 * =============================================================================
 * SERVICE WORKER - CAR FINDER PWA
 * =============================================================================
 * 
 * Enables offline functionality by caching app assets.
 * Uses a "cache-first" strategy for static assets and "network-first" for API calls.
 * 
 * Cache Versioning:
 * - Increment CACHE_VERSION when deploying updates to force cache refresh
 * - Old caches are automatically cleaned up during activation
 * =============================================================================
 */

// Cache version - increment this to invalidate old caches
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `car-finder-${CACHE_VERSION}`;

// Assets to cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/**
 * INSTALL EVENT
 * Fired when the service worker is first installed.
 * Pre-caches static assets for offline use.
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Pre-cache failed:', error);
      })
  );
});

/**
 * ACTIVATE EVENT
 * Fired when the service worker becomes active.
 * Cleans up old caches from previous versions.
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('car-finder-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

/**
 * FETCH EVENT
 * Intercepts network requests to serve cached content when offline.
 * 
 * Strategy:
 * 1. Try network first for fresh content
 * 2. Fall back to cache if offline
 * 3. Cache successful responses for future offline use
 */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    // Try network first
    fetch(event.request)
      .then((networkResponse) => {
        // Clone the response before caching (responses can only be read once)
        const responseToCache = networkResponse.clone();
        
        // Cache successful responses
        if (networkResponse.ok) {
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        
        return networkResponse;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Return a fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            
            // No cache available
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
      })
  );
});

/**
 * MESSAGE EVENT
 * Handles messages from the main thread (e.g., skip waiting command)
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
