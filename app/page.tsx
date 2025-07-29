"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Chatroom } from "@/components/chatroom"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const savedUser = localStorage.getItem("chatUser")
    if (!savedUser) {
      router.push("/login")
    }
  }, [router])

  return (
    <main className="min-h-screen">
      <Chatroom />
    </main>
  )
}
