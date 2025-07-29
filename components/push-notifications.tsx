"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff } from "lucide-react"

interface User {
  email?: string
  isGuest?: boolean
}

interface PushNotificationsProps {
  user: User | null
}

export function PushNotifications({ user }: PushNotificationsProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null)

  useEffect(() => {
    // Check if push notifications are supported
    const checkSupport = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.log("Push notifications not supported")
        setIsSupported(false)
        return
      }

      setIsSupported(true)

      // Check notification permission
      if ("Notification" in window) {
        setPermissionState(Notification.permission)
      }

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          const subscription = await registration.pushManager.getSubscription()
          setIsSubscribed(!!subscription)
          console.log("Push subscription status:", !!subscription)
        }
      } catch (error) {
        console.error("Error checking subscription:", error)
      }
    }

    if (user && !user.isGuest) {
      checkSupport()
    }
  }, [user])

  const subscribeToNotifications = async () => {
    if (!user?.email || user.isGuest) {
      alert("Push notifications are only available for registered users")
      return
    }

    setIsLoading(true)

    try {
      // Request notification permission first
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission()
        setPermissionState(permission)

        if (permission !== "granted") {
          throw new Error(`Notification permission ${permission}`)
        }
      }

      // Register service worker if not already registered
      let registration
      try {
        registration = await navigator.serviceWorker.getRegistration()

        if (!registration) {
          registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          })
          console.log("Service worker registered successfully")
        }
      } catch (swError) {
        console.error("Service worker registration failed:", swError)
        throw new Error("Failed to register service worker")
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready
      console.log("Service worker is ready")

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        console.log("Already subscribed to push notifications")
        setIsSubscribed(true)
        setIsLoading(false)
        return
      }

      // Get VAPID key
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BEl62iUYgUivxIkv69yViEuiBIa40HI2BNNfvdDUPGb5ZGSpsuBXiHjdQd1nuFSMcPiQXjFxmcvnuDHHjfZ6aIc"

      console.log("Using VAPID key:", vapidPublicKey)

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      console.log("Push subscription created:", subscription)

      // Send subscription to server
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          userEmail: user.email,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to subscribe to notifications")
      }

      setIsSubscribed(true)
      console.log("Successfully subscribed to push notifications")

      // Send a test notification
      await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Notifications enabled successfully!",
          senderName: "System",
          excludeUser: null, // Send to everyone including current user
        }),
      })
    } catch (error) {
      console.error("Error subscribing to notifications:", error)
      alert(`Failed to enable notifications: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribeFromNotifications = async () => {
    setIsLoading(true)

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        throw new Error("No service worker registration found")
      }

      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const unsubscribed = await subscription.unsubscribe()
        console.log("Unsubscribed from push notifications:", unsubscribed)
      }

      // Remove subscription from server
      await fetch("/api/notifications/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user?.email,
        }),
      })

      setIsSubscribed(false)
      console.log("Successfully unsubscribed from push notifications")
    } catch (error) {
      console.error("Error unsubscribing from notifications:", error)
      alert("Failed to disable notifications. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  if (!isSupported || !user || user.isGuest) {
    return null
  }

  // Show different button state based on permission
  let buttonTitle = isSubscribed ? "Disable notifications" : "Enable notifications"
  if (permissionState === "denied") {
    buttonTitle = "Notifications blocked"
  }

  return (
    <Button
      onClick={isSubscribed ? unsubscribeFromNotifications : subscribeToNotifications}
      disabled={isLoading || permissionState === "denied"}
      size="sm"
      variant="ghost"
      className="text-gray-400 hover:text-white hover:bg-gray-700"
      title={buttonTitle}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : isSubscribed ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
    </Button>
  )
}
