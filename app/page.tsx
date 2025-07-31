"use client"

import { Suspense } from "react"
import { Chatroom } from "@/components/chatroom"

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-red-500 bg-gradient-to-br from-gray-700 to-gray-800 shadow-sm flex items-center justify-center">
          <span className="text-2xl font-bold text-red-400">VN</span>
        </div>
        <div className="text-gray-100 mb-2">Loading Voltarian Networking...</div>
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={<LoadingFallback />}>
        <Chatroom />
      </Suspense>
    </main>
  )
}
