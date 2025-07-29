import { type NextRequest, NextResponse } from "next/server"

// In-memory fallback (should match the one in messages/route.ts)
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

// Simple polling endpoint for real-time updates
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const lastMessageId = url.searchParams.get("lastMessageId")

    const redis = await getRedisClient()

    if (!redis) {
      // Use memory storage as fallback
      if (lastMessageId) {
        const lastIndex = memoryMessages.findIndex((msg) => msg.id === lastMessageId)
        if (lastIndex !== -1) {
          const newMessages = memoryMessages.slice(lastIndex + 1)
          return NextResponse.json({ messages: newMessages })
        }
      }
      return NextResponse.json({ messages: memoryMessages.slice().reverse() })
    }

    const messages = await redis.lrange("chatroom:messages", 0, -1)
    const parsedMessages = messages.map((msg) => JSON.parse(msg as string)).reverse()

    // If lastMessageId is provided, only return newer messages
    if (lastMessageId) {
      const lastIndex = parsedMessages.findIndex((msg) => msg.id === lastMessageId)
      if (lastIndex !== -1) {
        const newMessages = parsedMessages.slice(lastIndex + 1)
        return NextResponse.json({ messages: newMessages })
      }
    }

    return NextResponse.json({ messages: parsedMessages })
  } catch (error) {
    console.error("Polling error:", error)
    return NextResponse.json({ messages: [] })
  }
}
