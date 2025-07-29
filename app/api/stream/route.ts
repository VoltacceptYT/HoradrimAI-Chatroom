import type { NextRequest } from "next/server"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const connectedClients: Set<ReadableStreamDefaultController> = new Set()

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Add client to connected clients
      connectedClients.add(controller)

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`))

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`))
        } catch (error) {
          clearInterval(heartbeatInterval)
          connectedClients.delete(controller)
        }
      }, 30000)

      // Clean up on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval)
        connectedClients.delete(controller)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}

// Broadcast message to all connected clients
export function broadcastMessage(message: any) {
  const data = JSON.stringify({ type: "message", message })
  connectedClients.forEach((controller) => {
    try {
      controller.enqueue(`data: ${data}\n\n`)
    } catch (error) {
      connectedClients.delete(controller)
    }
  })
}

// Broadcast clear event
export function broadcastClear() {
  const data = JSON.stringify({ type: "clear" })
  connectedClients.forEach((controller) => {
    try {
      controller.enqueue(`data: ${data}\n\n`)
    } catch (error) {
      connectedClients.delete(controller)
    }
  })
}

export { connectedClients }
