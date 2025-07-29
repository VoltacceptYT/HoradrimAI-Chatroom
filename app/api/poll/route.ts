import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for polling (shared with messages route)
const memoryMessages: any[] = []

// Enhanced polling endpoint for real-time updates
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const lastMessageId = url.searchParams.get("lastMessageId")
    const lastTimestamp = url.searchParams.get("lastTimestamp")

    // Get messages from the same memory storage as messages route
    const { memoryMessages: messages } = await import("./messages/route")
    const allMessages = messages.slice().reverse()

    // If lastMessageId is provided, only return newer messages
    if (lastMessageId) {
      const lastIndex = allMessages.findIndex((msg) => msg.id === lastMessageId)
      if (lastIndex !== -1) {
        const newMessages = allMessages.slice(lastIndex + 1)
        return NextResponse.json({
          messages: newMessages,
          hasNewMessages: newMessages.length > 0,
        })
      }
    }

    // If lastTimestamp is provided, return messages newer than that timestamp
    if (lastTimestamp) {
      const timestamp = Number.parseInt(lastTimestamp)
      const newMessages = allMessages.filter((msg) => msg.timestamp > timestamp)
      return NextResponse.json({
        messages: newMessages,
        hasNewMessages: newMessages.length > 0,
      })
    }

    return NextResponse.json({
      messages: allMessages,
      hasNewMessages: false,
    })
  } catch (error) {
    console.error("Polling error:", error)
    return NextResponse.json({
      messages: [],
      hasNewMessages: false,
      error: "Polling failed",
    })
  }
}
