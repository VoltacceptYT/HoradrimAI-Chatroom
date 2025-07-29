import type { NextRequest } from "next/server"

// Store connected clients globally
const connectedClients = new Set<ReadableStreamDefaultController>()

// Broadcast message to all connected clients
export function broadcastMessage(message: any) {
  const data = `data: ${JSON.stringify({ type: "message", message })}\n\n`
  connectedClients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(data))
    } catch (error) {
      connectedClients.delete(controller)
    }
  })
}

// Broadcast clear event
export function broadcastClear() {
  const data = `data: ${JSON.stringify({ type: "clear" })}\n\n`
  connectedClients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(data))
    } catch (error) {
      connectedClients.delete(controller)
    }
  })
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Add client to connected clients
      connectedClients.add(controller)
      console.log(`Client connected. Total clients: ${connectedClients.size}`)

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`))

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`))
        } catch (error) {
          clearInterval(heartbeatInterval)
          connectedClients.delete(controller)
          console.log(`Client disconnected. Total clients: ${connectedClients.size}`)
        }
      }, 30000)

      // Clean up on disconnect
      const cleanup = () => {
        clearInterval(heartbeatInterval)
        connectedClients.delete(controller)
        console.log(`Client disconnected. Total clients: ${connectedClients.size}`)
      }

      request.signal.addEventListener("abort", cleanup)
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

export { connectedClients }
