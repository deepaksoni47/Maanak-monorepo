// MAANAK (मानक) - Progressive Web App Service Worker
// Version: 1.0.0
// Offline-first caching for OIML R-76 test bench and laboratory inspection bays.

const CACHE_NAME = "maanak-v3-cache";
const STATIC_ASSETS = [
  "/",
  "/bench",
  "/dashboard",
  "/reports",
  "/weights",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[MAANAK SW] Non-fatal asset precache failure:", err);
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First strategy to ensure live stylesheet & component hot-reload updates
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip chrome-extension and non-GET requests
  if (event.request.method !== "GET" || url.protocol.startsWith("chrome-extension")) {
    return;
  }

  // Network-First with Cache Fallback for all navigation and CSS/JS chunks
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match("/bench");
          }
        });
      })
  );
});

// Background Sync Event Handler
self.addEventListener("sync", (event) => {
  if (event.tag === "maanak-sync-observations") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "MAANAK_TRIGGER_BACKGROUND_SYNC" });
        });
      })
    );
  }
});
