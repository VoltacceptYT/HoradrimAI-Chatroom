import { type NextRequest, NextResponse } from "next/server"
import { addDynamicUser } from "../users/[username]/route"

// Simple in-memory message storage - now organized by server
const messagesByServer: Record<string, Message[]> = {
  general: [], // Default general server
}
let messageCounter = 0

interface Message {
  id: string
  text: string
  username: string
  displayName: string
  profilePicture: string
  timestamp: number
  serverId: string
}

// Track online users per server (users who sent messages in last 5 minutes)
const onlineUsers: Record<string, Set<string>> = {}

// Helper function to generate unique message ID
function generateMessageId(): string {
  messageCounter++
  return `msg_${Date.now()}_${messageCounter}`
}

// Helper function to get online users for a server
function getOnlineUsers(serverId: string): string[] {
  const now = Date.now()
  const fiveMinutesAgo = now - 5 * 60 * 1000 // 5 minutes

  if (!messagesByServer[serverId]) {
    return []
  }

  // Get users who sent messages in the last 5 minutes
  const recentMessages = messagesByServer[serverId].filter((msg) => msg.timestamp > fiveMinutesAgo)
  const uniqueUsers = Array.from(new Set(recentMessages.map((msg) => msg.username)))

  return uniqueUsers
}

// GET - Retrieve messages for a server
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const serverId = url.searchParams.get("serverId") || "general"
    const since = url.searchParams.get("since")
    const getOnlineOnly = url.searchParams.get("onlineUsers") === "true"

    // Initialize server messages if not exists
    if (!messagesByServer[serverId]) {
      messagesByServer[serverId] = []
    }

    // If requesting online users only
    if (getOnlineOnly) {
      const onlineUsersList = getOnlineUsers(serverId)
      return NextResponse.json({
        success: true,
        onlineUsers: onlineUsersList,
        serverId,
      })
    }

    const serverMessages = messagesByServer[serverId]

    // If 'since' parameter is provided, return only newer messages
    if (since) {
      const sinceTimestamp = Number.parseInt(since)
      const newMessages = serverMessages.filter((msg) => msg.timestamp > sinceTimestamp)

      return NextResponse.json({
        success: true,
        messages: newMessages,
        total: serverMessages.length,
        hasNew: newMessages.length > 0,
        serverId,
        onlineUsers: getOnlineUsers(serverId),
      })
    }

    // Return all messages (most recent first for display)
    const sortedMessages = [...serverMessages].sort((a, b) => a.timestamp - b.timestamp)

    return NextResponse.json({
      success: true,
      messages: sortedMessages,
      total: serverMessages.length,
      hasNew: false,
      serverId,
      onlineUsers: getOnlineUsers(serverId),
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
        onlineUsers: [],
      },
      { status: 500 },
    )
  }
}

// POST - Send a new message to a server
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, username, displayName, profilePicture, serverId = "general", email, bio } = body

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

    // Initialize server messages if not exists
    if (!messagesByServer[serverId]) {
      messagesByServer[serverId] = []
    }

    // Add user to dynamic users database for profile viewing
    addDynamicUser({
      username: username.trim(),
      displayName: displayName?.trim() || username.trim(),
      profilePicture: profilePicture || "/placeholder.svg?height=40&width=40",
      customProfilePicture: null,
      bio: bio || "Community member",
      email: email || null,
    })

    // Create new message
    const newMessage: Message = {
      id: generateMessageId(),
      text: text.trim(),
      username: username.trim(),
      displayName: displayName?.trim() || username.trim(),
      profilePicture: profilePicture || "/placeholder.svg?height=40&width=40",
      timestamp: Date.now(),
      serverId,
    }

    // Add to server messages array
    messagesByServer[serverId].push(newMessage)

    // Keep only last 100 messages per server to prevent memory issues
    if (messagesByServer[serverId].length > 100) {
      messagesByServer[serverId] = messagesByServer[serverId].slice(-100)
    }

    console.log(`Message sent by ${newMessage.username} in ${serverId}: ${newMessage.text.substring(0, 50)}...`)
    console.log(`Total messages in ${serverId}: ${messagesByServer[serverId].length}`)

    return NextResponse.json({
      success: true,
      message: newMessage,
      total: messagesByServer[serverId].length,
      serverId,
      onlineUsers: getOnlineUsers(serverId),
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

// DELETE - Clear all messages in a server (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const serverId = url.searchParams.get("serverId") || "general"

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

    // Clear server messages
    const previousCount = messagesByServer[serverId]?.length || 0
    messagesByServer[serverId] = []

    console.log(`Chat cleared in ${serverId} by admin: ${userEmail} (${previousCount} messages removed)`)

    return NextResponse.json({
      success: true,
      cleared: previousCount,
      serverId,
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
export { messagesByServer }
