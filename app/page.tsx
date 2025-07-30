"use client"

import { useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Chatroom } from "@/components/chatroom"

function ChatroomWrapper() {
  const router = useRouter()

  useEffect(() => {
    const savedUser = localStorage.getItem("chatUser")
    if (!savedUser) {
      router.push("/login")
    }
  }, [router])

  return <Chatroom />
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
            <div className="text-gray-100">Loading...</div>
          </div>
        }
      >
        <ChatroomWrapper />
      </Suspense>
    </main>
  )
}
