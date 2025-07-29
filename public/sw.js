// Service Worker for push notifications and offline support

const CACHE_NAME = "voltarian-networking-v1"
const urlsToCache = ["/", "/login", "/offline", "/manifest.json"]

// Install event - cache resources with error handling
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache")
        // Add URLs one by one to handle failures gracefully
        return Promise.allSettled(
          urlsToCache.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Failed to cache ${url}:`, err)
              return null
            }),
          ),
        )
      })
      .then(() => {
        console.log("Cache setup completed")
        self.skipWaiting()
      })
      .catch((error) => {
        console.error("Cache setup failed:", error)
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
            if (cacheName !== CACHE_NAME) {
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

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith("http")) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response
      }

      // Try to fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response for caching
          const responseToCache = response.clone()

          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache)
            })
            .catch((error) => {
              console.warn("Failed to cache response:", error)
            })

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
