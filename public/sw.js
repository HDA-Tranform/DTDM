// Service Worker for DTDM PWA
const CACHE_NAME = "dtdm-cache-v20";
const urlsToCache = [
  "/",
  "/dashboard.html",
  "/documents.html",
  "/profile.html",
  "/payment.html",
  "/login.html",
  "/reset-password.html",
  "/css/styles.css",
  "/js/auth.js",
  "/js/dashboard.js",
  "/js/documents.js",
  "/js/profile.js",
  "/js/payment.js",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("📦 Cache opened");
        return cache.addAll(urlsToCache);
      })
      .catch((err) => console.log("Cache error:", err))
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("🗑️ Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and API calls
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }
          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
      .catch(() => {
        // Offline fallback for HTML pages
        if (event.request.headers.get("accept").includes("text/html")) {
          return caches.match("/dashboard.html");
        }
      })
  );
});

// Background sync for offline uploads (future feature)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-uploads") {
    console.log("🔄 Background sync triggered");
  }
});
