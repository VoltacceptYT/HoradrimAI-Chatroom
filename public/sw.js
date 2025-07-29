// Service Worker for push notifications and offline support

const CACHE_NAME = "voltarian-networking-v1"
const urlsToCache = ["/", "/login", "/offline", "/manifest.json", "/icon-192x192.png", "/icon-512x512.png"]

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache")
      return cache.addAll(urlsToCache)
    }),
  )
})

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        return response
      }

      return fetch(event.request).catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.destination === "document") {
          return caches.match("/offline")
        }
      })
    }),
  )
})

// Push event - handle push notifications
self.addEventListener("push", (event) => {
  if (event.data) {
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
  // Handle offline message queue
  console.log("Background sync triggered")
}
