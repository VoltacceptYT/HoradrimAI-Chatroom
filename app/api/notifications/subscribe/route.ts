import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for push subscriptions
let subscriptions: any[] = []

export async function POST(request: NextRequest) {
  try {
    const { subscription, userEmail } = await request.json()

    if (!subscription || !userEmail) {
      return NextResponse.json({ error: "Subscription and user email are required" }, { status: 400 })
    }

    console.log("Storing subscription for:", userEmail)
    console.log("Subscription object:", subscription)

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

export async function DELETE(request: NextRequest) {
  try {
    const { userEmail } = await request.json()

    if (!userEmail) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 })
    }

    // Remove subscription for user
    const initialCount = subscriptions.length
    subscriptions = subscriptions.filter((sub) => sub.userEmail !== userEmail)
    const removed = initialCount - subscriptions.length

    console.log(`Push subscription removed for user: ${userEmail}`)
    console.log(`Removed ${removed} subscriptions, ${subscriptions.length} remaining`)

    return NextResponse.json({ success: true, removed })
  } catch (error) {
    console.error("Failed to remove push subscription:", error)
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 })
  }
}

// Export subscriptions for use in other routes
export { subscriptions }
