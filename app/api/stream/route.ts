import type { NextRequest } from "next/server"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`))

      // Set up Redis subscription for real-time updates
      const subscriber = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

      // Poll for updates (since Upstash doesn't support persistent connections)
      const pollInterval = setInterval(async () => {
        try {
          // This is a simplified approach - in production you might want to use
          // a more sophisticated real-time solution
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`))
        } catch (error) {
          console.error("Polling error:", error)
        }
      }, 30000) // Heartbeat every 30 seconds

      // For real-time updates, we'll use a different approach
      // Since Upstash Redis doesn't support persistent pub/sub in serverless,
      // we'll implement a polling mechanism in the client

      request.signal.addEventListener("abort", () => {
        clearInterval(pollInterval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
