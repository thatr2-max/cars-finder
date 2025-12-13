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
const CACHE_VERSION = 'v1.1.0';
const CACHE_NAME = `car-finder-${CACHE_VERSION}`;
const TILES_CACHE_NAME = `car-finder-tiles-${CACHE_VERSION}`;

// Assets to cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Map tile URL patterns to cache
const TILE_URL_PATTERNS = [
  'basemaps.cartocdn.com',
  'tile.openstreetmap.org',
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
 * Check if URL is a map tile request
 */
function isMapTile(url) {
  return TILE_URL_PATTERNS.some(pattern => url.includes(pattern));
}

/**
 * FETCH EVENT
 * Intercepts network requests to serve cached content when offline.
 * 
 * Strategy:
 * - Map tiles: Cache-first (tiles don't change often)
 * - App assets: Network-first with cache fallback
 */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  const url = event.request.url;
  
  // Handle map tiles with cache-first strategy
  if (isMapTile(url)) {
    event.respondWith(
      caches.open(TILES_CACHE_NAME)
        .then((cache) => {
          return cache.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                // Return cached tile, but also refresh in background
                fetch(event.request)
                  .then((networkResponse) => {
                    if (networkResponse.ok) {
                      cache.put(event.request, networkResponse.clone());
                    }
                  })
                  .catch(() => {}); // Ignore network errors for background refresh
                return cachedResponse;
              }
              
              // Not in cache, fetch from network
              return fetch(event.request)
                .then((networkResponse) => {
                  if (networkResponse.ok) {
                    cache.put(event.request, networkResponse.clone());
                  }
                  return networkResponse;
                })
                .catch(() => {
                  // Return a transparent placeholder for failed tiles
                  return new Response('', { status: 404 });
                });
            });
        })
    );
    return;
  }
  
  // Skip other cross-origin requests
  if (!url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    // Try network first for app assets
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
  
  // Handle pre-cache tiles request
  if (event.data && event.data.type === 'CACHE_TILES') {
    const { latitude, longitude, zoom } = event.data;
    precacheTilesAroundLocation(latitude, longitude, zoom || 17);
  }
});

/**
 * Pre-cache map tiles around a location
 * Caches tiles at zoom levels 15-18 in a small radius
 */
async function precacheTilesAroundLocation(lat, lng, baseZoom) {
  const cache = await caches.open(TILES_CACHE_NAME);
  const zoomLevels = [15, 16, 17, 18];
  const tileUrls = [];
  
  for (const zoom of zoomLevels) {
    // Convert lat/lng to tile coordinates
    const { x, y } = latLngToTile(lat, lng, zoom);
    
    // Cache a 3x3 grid around the center tile
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tileX = x + dx;
        const tileY = y + dy;
        const url = `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${tileX}/${tileY}.png`;
        tileUrls.push(url);
      }
    }
  }
  
  console.log(`[ServiceWorker] Pre-caching ${tileUrls.length} tiles around location`);
  
  // Fetch and cache tiles in parallel (with some rate limiting)
  const batchSize = 6;
  for (let i = 0; i < tileUrls.length; i += batchSize) {
    const batch = tileUrls.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (e) {
          // Ignore individual tile failures
        }
      })
    );
  }
  
  console.log('[ServiceWorker] Tile pre-caching complete');
}

/**
 * Convert latitude/longitude to tile coordinates
 */
function latLngToTile(lat, lng, zoom) {
  const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y };
}

/**
 * NOTIFICATION CLICK EVENT
 * Handles clicks on push notifications and their action buttons.
 * Opens the app and navigates to find mode when user taps "Find Car".
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action);
  
  // Close the notification
  event.notification.close();
  
  // Determine the URL to open
  const urlToOpen = event.action === 'find' 
    ? '/?action=find'
    : '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            // Focus existing window and navigate
            return client.focus().then((focusedClient) => {
              if (focusedClient) {
                focusedClient.navigate(urlToOpen);
              }
            });
          }
        }
        // No existing window, open a new one
        return clients.openWindow(urlToOpen);
      })
  );
});
