import { type NextRequest, NextResponse } from "next/server"
import webpush from "web-push"

// Configure web-push with environment variables
webpush.setVapidDetails(
  "mailto:admin@voltaccept.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    "BEl62iUYgUivxIkv69yViEuiBIa40HI2BNNfvdDUPGb5ZGSpsuBXiHjdQd1nuFSMcPiQXjFxmcvnuDHHjfZ6aIc",
  process.env.VAPID_PRIVATE_KEY || "VCzVVOhpLU-dLQ4VawaiV0hkiYJcHBVRag15zQVHyC0",
)

// In-memory storage for push subscriptions
let subscriptions: any[] = []

export async function POST(request: NextRequest) {
  try {
    const { message, senderName, excludeUser } = await request.json()

    console.log("Sending notification:", { message, senderName, excludeUser })
    console.log("Current subscriptions:", subscriptions.length)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No subscriptions found" })
    }

    const payload = JSON.stringify({
      title: "New Message - Voltarian Networking",
      body: `${senderName}: ${message.substring(0, 100)}${message.length > 100 ? "..." : ""}`,
      icon: "/icon-192x192.png",
      badge: "/icon-96x96.png",
      tag: "new-message",
      data: {
        url: "/",
        timestamp: Date.now(),
      },
    })

    console.log("Notification payload:", payload)

    // Send notifications to all subscribers except the sender
    const notificationPromises = subscriptions
      .filter((sub) => excludeUser === null || sub.userEmail !== excludeUser)
      .map(async (sub) => {
        try {
          console.log(`Sending notification to ${sub.userEmail}`)
          await webpush.sendNotification(sub.subscription, payload)
          console.log(`Notification sent to ${sub.userEmail}`)
          return true
        } catch (error) {
          console.error(`Failed to send notification to ${sub.userEmail}:`, error)
          // Remove invalid subscription
          subscriptions = subscriptions.filter((s) => s !== sub)
          return false
        }
      })

    const results = await Promise.allSettled(notificationPromises)
    const successful = results.filter((r) => r.status === "fulfilled" && r.value === true).length

    console.log(`Successfully sent ${successful} notifications`)

    return NextResponse.json({ success: true, sent: successful })
  } catch (error) {
    console.error("Failed to send notifications:", error)
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ subscriptions: subscriptions.length })
}

// Store subscription
export async function PUT(request: NextRequest) {
  try {
    const { subscription, userEmail } = await request.json()

    if (!subscription || !userEmail) {
      return NextResponse.json({ error: "Subscription and user email are required" }, { status: 400 })
    }

    // Store subscription with user email
    const existingIndex = subscriptions.findIndex((sub) => sub.userEmail === userEmail)

    if (existingIndex !== -1) {
      // Update existing subscription
      subscriptions[existingIndex] = { subscription, userEmail, timestamp: Date.now() }
    } else {
      // Add new subscription
      subscriptions.push({ subscription, userEmail, timestamp: Date.now() })
    }

    console.log(`Push subscription stored for user: ${userEmail}`)
    console.log("Total subscriptions:", subscriptions.length)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to store push subscription:", error)
    return NextResponse.json({ error: "Failed to store subscription" }, { status: 500 })
  }
}
