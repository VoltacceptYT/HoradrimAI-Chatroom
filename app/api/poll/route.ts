import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for polling (shared with messages route)
const memoryMessages: any[] = []

async function getRedisClient() {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return null
    }

    const { Redis } = await import("@upstash/redis")
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  } catch (error) {
    console.error("Failed to initialize Redis:", error)
    return null
  }
}

// Enhanced polling endpoint for real-time updates
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const lastMessageId = url.searchParams.get("lastMessageId")
    const lastTimestamp = url.searchParams.get("lastTimestamp")

    const redis = await getRedisClient()

    let messages: any[] = []

    if (!redis) {
      // Use memory storage as fallback
      messages = memoryMessages.slice().reverse()
    } else {
      const redisMessages = await redis.lrange("chatroom:messages", 0, -1)
      messages = redisMessages.map((msg) => JSON.parse(msg as string)).reverse()
    }

    // If lastMessageId is provided, only return newer messages
    if (lastMessageId) {
      const lastIndex = messages.findIndex((msg) => msg.id === lastMessageId)
      if (lastIndex !== -1) {
        const newMessages = messages.slice(lastIndex + 1)
        return NextResponse.json({
          messages: newMessages,
          hasNewMessages: newMessages.length > 0,
        })
      }
    }

    // If lastTimestamp is provided, return messages newer than that timestamp
    if (lastTimestamp) {
      const timestamp = Number.parseInt(lastTimestamp)
      const newMessages = messages.filter((msg) => msg.timestamp > timestamp)
      return NextResponse.json({
        messages: newMessages,
        hasNewMessages: newMessages.length > 0,
      })
    }

    return NextResponse.json({
      messages: messages,
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
