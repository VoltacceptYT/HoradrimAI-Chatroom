import { type NextRequest, NextResponse } from "next/server"
import webpush from "web-push"

// Configure web-push (you'll need to set these environment variables)
webpush.setVapidDetails(
  "mailto:admin@voltaccept.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    "BEl62iUYgUivxIkv69yViEuiBIa40HI2BNNfvdDUPGb5ZGSpsuBXiHjdQd1nuFSMcPiQXjFxmcvnuDHHjfZ6aIc",
  process.env.VAPID_PRIVATE_KEY || "VCzVVOhpLU-dLQ4VawaiV0hkiYJcHBVRag15zQVHyC0",
)

export async function POST(request: NextRequest) {
  try {
    const { message, senderName, excludeUser } = await request.json()

    // Import subscriptions from subscribe route
    const { subscriptions } = await import("../subscribe/route")

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

    // Send notifications to all subscribers except the sender
    const notifications = subscriptions
      .filter((sub) => sub.userEmail !== excludeUser)
      .map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload)
          console.log(`Notification sent to ${sub.userEmail}`)
        } catch (error) {
          console.error(`Failed to send notification to ${sub.userEmail}:`, error)
          // Remove invalid subscription
          const index = subscriptions.indexOf(sub)
          if (index > -1) {
            subscriptions.splice(index, 1)
          }
        }
      })

    await Promise.all(notifications)

    return NextResponse.json({ success: true, sent: notifications.length })
  } catch (error) {
    console.error("Failed to send notifications:", error)
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 })
  }
}
