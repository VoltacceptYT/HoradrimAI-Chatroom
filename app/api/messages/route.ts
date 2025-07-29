import { type NextRequest, NextResponse } from "next/server"

// In-memory fallback storage for development/when Redis is unavailable
let memoryMessages: Message[] = []

interface Message {
  id: string
  text: string
  username: string
  profilePicture: string
  timestamp: number
}

// Initialize Redis connection with error handling
async function getRedisClient() {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.log("Redis environment variables not found, using memory storage")
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

// Get messages
export async function GET() {
  try {
    const redis = await getRedisClient()

    if (!redis) {
      // Use memory storage as fallback
      return NextResponse.json({
        messages: memoryMessages.slice().reverse(),
      })
    }

    const messages = await redis.lrange("chatroom:messages", 0, -1)
    const parsedMessages = messages.map((msg) => JSON.parse(msg as string))

    return NextResponse.json({
      messages: parsedMessages.reverse(),
    })
  } catch (error) {
    console.error("Failed to get messages:", error)
    // Fallback to memory storage
    return NextResponse.json({
      messages: memoryMessages.slice().reverse(),
    })
  }
}

// Send message
export async function POST(request: NextRequest) {
  try {
    const { text, username, profilePicture } = await request.json()

    if (!text || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      username,
      profilePicture: profilePicture || "/placeholder.svg?height=40&width=40",
      timestamp: Date.now(),
    }

    const redis = await getRedisClient()

    if (!redis) {
      // Use memory storage as fallback
      memoryMessages.unshift(message)
      // Keep only last 100 messages
      if (memoryMessages.length > 100) {
        memoryMessages = memoryMessages.slice(0, 100)
      }
      return NextResponse.json({ success: true, message })
    }

    // Store message in Redis
    await redis.lpush("chatroom:messages", JSON.stringify(message))
    await redis.ltrim("chatroom:messages", 0, 99)

    // Try to broadcast (optional, won't fail if pub/sub doesn't work)
    try {
      await redis.publish(
        "chatroom:updates",
        JSON.stringify({
          type: "message",
          message,
        }),
      )
    } catch (pubError) {
      console.log("Pub/sub not available, using polling fallback")
    }

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error("Failed to send message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

// Clear messages
export async function DELETE() {
  try {
    const redis = await getRedisClient()

    if (!redis) {
      // Clear memory storage
      memoryMessages = []
      return NextResponse.json({ success: true })
    }

    await redis.del("chatroom:messages")

    // Try to broadcast clear event (optional)
    try {
      await redis.publish(
        "chatroom:updates",
        JSON.stringify({
          type: "clear",
        }),
      )
    } catch (pubError) {
      console.log("Pub/sub not available for clear broadcast")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to clear messages:", error)
    // Fallback: clear memory storage
    memoryMessages = []
    return NextResponse.json({ success: true })
  }
}
