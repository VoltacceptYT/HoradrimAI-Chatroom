import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for messages (no Redis)
let memoryMessages: Message[] = []

interface Message {
  id: string
  text: string
  username: string
  displayName: string
  profilePicture: string
  timestamp: number
}

// Get messages
export async function GET() {
  try {
    console.log(`Retrieved ${memoryMessages.length} messages from memory`)
    return NextResponse.json({
      messages: memoryMessages.slice().reverse(),
    })
  } catch (error) {
    console.error("Failed to get messages:", error)
    return NextResponse.json({
      messages: [],
    })
  }
}

// Send message
export async function POST(request: NextRequest) {
  try {
    const { text, username, displayName, profilePicture } = await request.json()

    if (!text || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      username,
      displayName: displayName || username,
      profilePicture: profilePicture || "/placeholder.svg?height=40&width=40",
      timestamp: Date.now(),
    }

    console.log("Storing message in memory:", message.id)
    memoryMessages.unshift(message)

    // Keep last 100 messages
    if (memoryMessages.length > 100) {
      memoryMessages = memoryMessages.slice(0, 100)
    }

    console.log("Message stored successfully in memory")

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error("Failed to send message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

// Clear messages (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is admin
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = authHeader.replace("Bearer ", "")
    if (!userEmail.endsWith("@voltaccept.com")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    console.log("Clearing memory storage")
    memoryMessages = []
    console.log("Memory messages cleared successfully")

    console.log("Chat cleared by admin:", userEmail)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to clear messages:", error)
    return NextResponse.json({ error: "Failed to clear messages" }, { status: 500 })
  }
}
