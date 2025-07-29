// Service Worker for push notifications and offline support

const CACHE_NAME = "voltarian-networking-v1"
const STATIC_CACHE_NAME = "voltarian-static-v1"

// Static resources to cache (pages, manifest, etc.)
const staticUrlsToCache = ["/", "/login", "/offline", "/manifest.json"]

// Install event - cache static resources only
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("Opened static cache")
        // Add URLs one by one to handle failures gracefully
        return Promise.allSettled(
          staticUrlsToCache.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Failed to cache ${url}:`, err)
              return null
            }),
          ),
        )
      })
      .then(() => {
        console.log("Static cache setup completed")
        self.skipWaiting()
      })
      .catch((error) => {
        console.error("Static cache setup failed:", error)
      }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        self.clients.claim()
      }),
  )
})

// Helper function to check if URL should be cached
function shouldCache(url) {
  // Never cache API routes - they need to be fresh
  if (url.includes("/api/")) {
    return false
  }

  // Never cache dynamic data
  if (url.includes("_next/static") && url.includes("chunks")) {
    return false
  }

  // Only cache static pages and assets
  return (
    url.includes("/") || url.includes(".js") || url.includes(".css") || url.includes(".png") || url.includes(".ico")
  )
}

// Fetch event - smart caching strategy
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith("http")) {
    return
  }

  const url = new URL(event.request.url)

  // API routes - always fetch from network, never cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response
        })
        .catch((error) => {
          console.log("API request failed:", error)
          // Return a basic error response for API calls
          return new Response(JSON.stringify({ error: "Network unavailable", offline: true }), {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "application/json" },
          })
        }),
    )
    return
  }

  // Static resources - cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available for static resources
      if (cachedResponse) {
        return cachedResponse
      }

      // Fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Only cache static resources
          if (shouldCache(event.request.url)) {
            const responseToCache = response.clone()
            caches
              .open(STATIC_CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache)
              })
              .catch((error) => {
                console.warn("Failed to cache response:", error)
              })
          }

          return response
        })
        .catch(() => {
          // If both cache and network fail, show offline page for navigation requests
          if (event.request.destination === "document") {
            return caches.match("/offline")
          }

          // For other requests, return a basic response
          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
          })
        })
    }),
  )
})

// Push event - handle push notifications
self.addEventListener("push", (event) => {
  if (event.data) {
    try {
      const data = event.data.json()

      const options = {
        body: data.body,
        icon: data.icon || "/icon-192x192.png",
        badge: data.badge || "/icon-96x96.png",
        tag: data.tag || "default",
        data: data.data || {},
        actions: [
          {
            action: "open",
            title: "Open Chat",
            icon: "/icon-96x96.png",
          },
          {
            action: "close",
            title: "Dismiss",
          },
        ],
        requireInteraction: true,
        vibrate: [200, 100, 200],
      }

      event.waitUntil(self.registration.showNotification(data.title || "Voltarian Networking", options))
    } catch (error) {
      console.error("Error handling push event:", error)
    }
  }
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "open" || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url || "/"))
  }
})

// Background sync for offline messages
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    console.log("Background sync triggered")
    // Handle offline message queue here if needed
  } catch (error) {
    console.error("Background sync failed:", error)
  }
}

// Handle service worker errors
self.addEventListener("error", (event) => {
  console.error("Service worker error:", event.error)
})

// Handle unhandled promise rejections
self.addEventListener("unhandledrejection", (event) => {
  console.error("Service worker unhandled rejection:", event.reason)
  event.preventDefault()
})
