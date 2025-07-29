// Service Worker for push notifications and offline support

const CACHE_NAME = "voltarian-networking-v2"
const STATIC_CACHE_NAME = "voltarian-static-v2"

// Static resources to cache (pages, manifest, etc.)
const staticUrlsToCache = ["/", "/login", "/offline", "/manifest.json"]

// Install event - cache static resources only
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")
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
  console.log("Service Worker activating...")
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
        console.log("Service Worker activated and claiming clients")
        return self.clients.claim()
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
  if (url.includes("_next/data")) {
    return false
  }

  // Only cache static pages and assets
  return (
    url.endsWith("/") ||
    url.includes(".js") ||
    url.includes(".css") ||
    url.includes(".png") ||
    url.includes(".ico") ||
    url.includes(".svg") ||
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".gif")
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
          if (!response || response.status !== 200) {
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
  console.log("Push event received:", event)

  if (event.data) {
    try {
      const data = event.data.json()
      console.log("Push data:", data)

      const options = {
        body: data.body || "New message received",
        icon: data.icon || "/icon-192x192.png",
        badge: data.badge || "/icon-96x96.png",
        tag: data.tag || "default",
        data: data.data || { url: "/" },
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

      console.log("Showing notification with options:", options)

      event.waitUntil(
        self.registration
          .showNotification(data.title || "Voltarian Networking", options)
          .then(() => console.log("Notification shown successfully"))
          .catch((err) => console.error("Error showing notification:", err)),
      )
    } catch (error) {
      console.error("Error handling push event:", error)

      // Fallback notification if JSON parsing fails
      event.waitUntil(
        self.registration.showNotification("Voltarian Networking", {
          body: "You have a new message",
          icon: "/icon-192x192.png",
          badge: "/icon-96x96.png",
        }),
      )
    }
  } else {
    console.log("Push event has no data")
  }
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event)

  event.notification.close()

  if (event.action === "open" || !event.action) {
    const urlToOpen = event.notification.data?.url || "/"
    console.log("Opening URL:", urlToOpen)

    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus()
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      }),
    )
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

// Log when service worker is installed
console.log("Service Worker script loaded")
