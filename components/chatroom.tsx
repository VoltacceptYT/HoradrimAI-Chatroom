"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Trash2 } from "lucide-react"

interface Message {
  id: string
  text: string
  username: string
  profilePicture: string
  timestamp: number
}

interface User {
  username: string
  profilePicture: string
}

export function Chatroom() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)

  // Initialize user
  useEffect(() => {
    const savedUser = localStorage.getItem("chatUser")
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        // If parsing fails, create new user
        createGuestUser()
      }
    } else {
      createGuestUser()
    }
  }, [])

  const createGuestUser = () => {
    const guestUser = {
      username: `Guest${Math.floor(Math.random() * 10000)}`,
      profilePicture: "/placeholder.svg?height=40&width=40",
    }
    setUser(guestUser)
    localStorage.setItem("chatUser", JSON.stringify(guestUser))
  }

  // Set up polling for real-time updates
  useEffect(() => {
    if (!user) return

    setIsConnected(true)
    loadMessages()

    // Poll for new messages every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollForUpdates()
    }, 2000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [user])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = async () => {
    try {
      setError(null)
      const response = await fetch("/api/messages")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON")
      }

      const data = await response.json()
      setMessages(data.messages || [])

      // Update last message ID for polling
      if (data.messages && data.messages.length > 0) {
        lastMessageIdRef.current = data.messages[data.messages.length - 1].id
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
      setError("Failed to load messages. Using offline mode.")
      setMessages([])
    }
  }

  const pollForUpdates = async () => {
    try {
      const url = lastMessageIdRef.current ? `/api/poll?lastMessageId=${lastMessageIdRef.current}` : "/api/poll"

      const response = await fetch(url)

      if (!response.ok) return

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) return

      const data = await response.json()

      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => [...prev, ...data.messages])
        lastMessageIdRef.current = data.messages[data.messages.length - 1].id
      }
    } catch (error) {
      // Silently fail polling errors to avoid spam
      console.log("Polling update failed:", error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !user) return

    try {
      setError(null)
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputValue.trim(),
          username: user.username,
          profilePicture: user.profilePicture,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON")
      }

      const data = await response.json()

      if (data.success) {
        setInputValue("")
        // Add message locally for immediate feedback
        setMessages((prev) => [...prev, data.message])
        lastMessageIdRef.current = data.message.id
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setError("Failed to send message. Please try again.")
    }
  }

  const clearChat = async () => {
    try {
      setError(null)
      const response = await fetch("/api/messages", {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setMessages([])
      lastMessageIdRef.current = null
      setShowClearModal(false)
    } catch (error) {
      console.error("Failed to clear chat:", error)
      setError("Failed to clear chat. Please try again.")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-200">
        <div className="text-blue-900">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center p-0">
      <div className="w-full h-screen max-w-none bg-gradient-to-b from-blue-50/85 to-blue-100/85 backdrop-blur-sm border-0 shadow-none flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-b from-blue-200/60 to-blue-300/40 p-4 border-b border-blue-300/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/placeholder.svg?height=32&width=32"
                alt="HoradrimAI"
                className="w-8 h-8 rounded-full border-2 border-blue-400/50 shadow-sm"
              />
              <div>
                <h1 className="text-lg font-bold text-blue-900">HoradrimAI Chatroom</h1>
                <p className="text-xs text-blue-700">
                  {isConnected ? `Connected as ${user.username}` : "Connecting..."}
                  {error && <span className="text-red-600 ml-2">({error})</span>}
                </p>
              </div>
            </div>
            <div className="text-xs text-blue-700">{messages.length} messages</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 bg-blue-50/45 shadow-inner chat-scrollbar">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-blue-600 py-8">
                <p>Welcome to HoradrimAI Chatroom!</p>
                <p className="text-sm mt-2">Start a conversation by typing a message below.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex flex-col max-w-[75%]">
                  {/* Profile */}
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={message.profilePicture || "/placeholder.svg"}
                      alt={message.username}
                      className="w-6 h-6 rounded-full border border-blue-300/50 shadow-sm"
                    />
                    <span className="text-xs font-medium text-blue-800">{message.username}</span>
                    <span className="text-xs text-blue-600">{formatTime(message.timestamp)}</span>
                  </div>

                  {/* Message */}
                  <div className="bg-gradient-to-br from-white/95 to-blue-50/95 backdrop-blur-sm border border-blue-200/50 rounded-xl rounded-tl-sm p-3 shadow-sm">
                    <div className="text-sm text-blue-900 whitespace-pre-wrap break-words">{message.text}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={sendMessage}
          className="p-3 bg-gradient-to-t from-blue-100/70 to-blue-50/70 border-t border-blue-300/50 shadow-sm"
        >
          <div className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-white/95 border-blue-300/50 focus:border-blue-400 focus:ring-blue-200 text-sm rounded-xl"
              disabled={!isConnected}
            />
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={!inputValue.trim() || !isConnected}
                className="h-10 w-10 p-0 bg-gradient-to-b from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 border border-blue-300 text-blue-800 shadow-sm rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowClearModal(true)}
                className="h-10 w-10 p-0 bg-gradient-to-b from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 border border-blue-300 text-blue-800 shadow-sm rounded-full"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-blue-50 to-blue-100 border-2 border-blue-300/50 rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <p className="text-blue-900 mb-4 font-medium">Are you sure you want to clear the chat history?</p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setShowClearModal(false)}
                variant="outline"
                size="sm"
                className="bg-gradient-to-b from-blue-100 to-blue-200 border-blue-300 text-blue-800 hover:from-blue-200 hover:to-blue-300"
              >
                No
              </Button>
              <Button
                onClick={clearChat}
                size="sm"
                className="bg-gradient-to-b from-blue-200 to-blue-300 border-blue-400 text-blue-900 hover:from-blue-300 hover:to-blue-400"
              >
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
