"use client"

import { Button } from "@/components/ui/button"
import { Wifi, RefreshCw, Home } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function OfflinePage() {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)

    try {
      // Check if we're back online by testing a simple endpoint
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch("/api/messages", {
        method: "GET",
        cache: "no-cache",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        // We're back online, redirect to home
        window.location.href = "/"
      } else {
        throw new Error("Server not responding")
      }
    } catch (error) {
      console.log("Still offline or server error:", error.message)
      // Show user-friendly message
      alert("Still unable to connect. Please check your internet connection.")
    } finally {
      setIsRetrying(false)
    }
  }

  const handleGoHome = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-red-500/50 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
          <Wifi className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-100 mb-4">You're Offline</h1>

        <p className="text-gray-400 mb-6">
          It looks like you've lost your internet connection. Check your network settings and try again.
        </p>

        <div className="space-y-4">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500 text-white"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking Connection...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </>
            )}
          </Button>

          <Button
            onClick={handleGoHome}
            variant="outline"
            className="w-full bg-gradient-to-b from-gray-700 to-gray-800 border-gray-600 text-gray-200 hover:from-gray-600 hover:to-gray-700"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
        </div>

        <div className="mt-8 text-xs text-gray-500">
          <p>Voltarian Networking</p>
          <p>Some features may be limited while offline</p>
        </div>
      </div>
    </div>
  )
}
