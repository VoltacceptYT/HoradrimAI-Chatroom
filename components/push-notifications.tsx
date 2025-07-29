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

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true)
      checkSubscription()
    }
  }, [user])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error("Error checking subscription:", error)
    }
  }

  const subscribeToNotifications = async () => {
    if (!user?.email || user.isGuest) {
      alert("Push notifications are only available for registered users")
      return
    }

    setIsLoading(true)

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        throw new Error("Notification permission denied")
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
            "BEl62iUYgUivxIkv69yViEuiBIa40HI2BNNfvdDUPGb5ZGSpsuBXiHjdQd1nuFSMcPiQXjFxmcvnuDHHjfZ6aIc",
        ),
      })

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
    } catch (error) {
      console.error("Error subscribing to notifications:", error)
      alert("Failed to enable notifications. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribeFromNotifications = async () => {
    setIsLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
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

  return (
    <Button
      onClick={isSubscribed ? unsubscribeFromNotifications : subscribeToNotifications}
      disabled={isLoading}
      size="sm"
      variant="ghost"
      className="text-gray-400 hover:text-white hover:bg-gray-700"
      title={isSubscribed ? "Disable notifications" : "Enable notifications"}
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
