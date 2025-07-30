import { type NextRequest, NextResponse } from "next/server"

// Simple in-memory message storage
let messages: Message[] = []
let messageCounter = 0

interface Message {
  id: string
  text: string
  username: string
  displayName: string
  profilePicture: string
  timestamp: number
}

// Helper function to generate unique message ID
function generateMessageId(): string {
  messageCounter++
  return `msg_${Date.now()}_${messageCounter}`
}

// GET - Retrieve all messages
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const since = url.searchParams.get("since")

    // If 'since' parameter is provided, return only newer messages
    if (since) {
      const sinceTimestamp = Number.parseInt(since)
      const newMessages = messages.filter((msg) => msg.timestamp > sinceTimestamp)

      return NextResponse.json({
        success: true,
        messages: newMessages,
        total: messages.length,
        hasNew: newMessages.length > 0,
      })
    }

    // Return all messages (most recent first for display)
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp)

    return NextResponse.json({
      success: true,
      messages: sortedMessages,
      total: messages.length,
      hasNew: false,
    })
  } catch (error) {
    console.error("Error retrieving messages:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve messages",
        messages: [],
        total: 0,
        hasNew: false,
      },
      { status: 500 },
    )
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, username, displayName, profilePicture } = body

    // Validate required fields
    if (!text || !username) {
      return NextResponse.json(
        {
          success: false,
          error: "Text and username are required",
        },
        { status: 400 },
      )
    }

    // Create new message
    const newMessage: Message = {
      id: generateMessageId(),
      text: text.trim(),
      username: username.trim(),
      displayName: displayName?.trim() || username.trim(),
      profilePicture: profilePicture || "/placeholder.svg?height=40&width=40",
      timestamp: Date.now(),
    }

    // Add to messages array
    messages.push(newMessage)

    // Keep only last 100 messages to prevent memory issues
    if (messages.length > 100) {
      messages = messages.slice(-100)
    }

    console.log(`Message sent by ${newMessage.username}: ${newMessage.text.substring(0, 50)}...`)
    console.log(`Total messages: ${messages.length}`)

    return NextResponse.json({
      success: true,
      message: newMessage,
      total: messages.length,
    })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send message",
      },
      { status: 500 },
    )
  }
}

// DELETE - Clear all messages (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "Authorization required",
        },
        { status: 401 },
      )
    }

    const userEmail = authHeader.replace("Bearer ", "")
    if (!userEmail.endsWith("@voltaccept.com")) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        { status: 403 },
      )
    }

    // Clear all messages
    const previousCount = messages.length
    messages = []
    messageCounter = 0

    console.log(`Chat cleared by admin: ${userEmail} (${previousCount} messages removed)`)

    return NextResponse.json({
      success: true,
      cleared: previousCount,
    })
  } catch (error) {
    console.error("Error clearing messages:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear messages",
      },
      { status: 500 },
    )
  }
}

// Export messages for other routes if needed
export { messages }
