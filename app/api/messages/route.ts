import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for real-time updates
let memoryMessages: Message[] = []
const connectedClients: Set<ReadableStreamDefaultController> = new Set()

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

// Broadcast message to all connected clients
function broadcastMessage(message: any) {
  const data = JSON.stringify({ type: "message", message })
  connectedClients.forEach((controller) => {
    try {
      controller.enqueue(`data: ${data}\n\n`)
    } catch (error) {
      // Remove disconnected clients
      connectedClients.delete(controller)
    }
  })
}

// Broadcast clear event to all connected clients
function broadcastClear() {
  const data = JSON.stringify({ type: "clear" })
  connectedClients.forEach((controller) => {
    try {
      controller.enqueue(`data: ${data}\n\n`)
    } catch (error) {
      connectedClients.delete(controller)
    }
  })
}

// Get messages
export async function GET() {
  try {
    const redis = await getRedisClient()

    if (!redis) {
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
      if (memoryMessages.length > 100) {
        memoryMessages = memoryMessages.slice(0, 100)
      }
    } else {
      // Store message in Redis
      await redis.lpush("chatroom:messages", JSON.stringify(message))
      await redis.ltrim("chatroom:messages", 0, 99)
    }

    // Broadcast to all connected clients
    broadcastMessage(message)

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

    const redis = await getRedisClient()

    if (!redis) {
      memoryMessages = []
    } else {
      await redis.del("chatroom:messages")
    }

    // Broadcast clear event
    broadcastClear()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to clear messages:", error)
    return NextResponse.json({ error: "Failed to clear messages" }, { status: 500 })
  }
}

// Export the connectedClients for use in stream endpoint
export { connectedClients }
