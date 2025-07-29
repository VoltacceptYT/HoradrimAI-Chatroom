"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Trash2, LogOut, Settings } from "lucide-react"
import { InstallPrompt } from "@/components/install-prompt"
import { PushNotifications } from "@/components/push-notifications"
import { ProfileSettings } from "@/components/profile-settings"

interface Message {
  id: string
  text: string
  username: string
  displayName: string
  profilePicture: string
  timestamp: number
}

interface User {
  username: string
  displayName: string
  email?: string
  profilePicture: string
  customProfilePicture?: string
  bio?: string
  isGuest?: boolean
  isAdmin?: boolean
}

export function Chatroom() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const lastTimestampRef = useRef<number>(0)
  const router = useRouter()

  // Initialize user and check authentication
  useEffect(() => {
    const savedUser = localStorage.getItem("chatUser")
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
      } catch {
        router.push("/login")
      }
    } else {
      router.push("/login")
    }
  }, [router])

  // Set up polling for real-time messages
  useEffect(() => {
    if (!user) return

    console.log("Setting up polling for real-time updates...")
    setIsConnected(true)

    // Load initial messages
    loadMessages()

    // Start polling for new messages every 1 second for better responsiveness
    pollingIntervalRef.current = setInterval(() => {
      pollForUpdates()
    }, 1000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        console.log("Stopped polling")
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
      console.log("Loading initial messages...")

      // Add cache-busting parameter and headers to ensure fresh data
      const response = await fetch(`/api/messages?t=${Date.now()}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON")
      }

      const data = await response.json()
      console.log("Loaded messages:", data.messages?.length || 0)
      setMessages(data.messages || [])

      // Update tracking references
      if (data.messages && data.messages.length > 0) {
        const latestMessage = data.messages[data.messages.length - 1]
        lastMessageIdRef.current = latestMessage.id
        lastTimestampRef.current = latestMessage.timestamp
        console.log("Set initial tracking - ID:", latestMessage.id, "Timestamp:", latestMessage.timestamp)
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
      setError("Failed to load messages.")
      setIsConnected(false)
    }
  }

  const pollForUpdates = async () => {
    try {
      // Always poll for all messages with cache-busting to ensure fresh data
      const response = await fetch(`/api/messages?t=${Date.now()}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (!response.ok) {
        console.log("Polling request failed:", response.status)
        return
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.log("Polling response is not JSON")
        return
      }

      const data = await response.json()
      const newMessages = data.messages || []

      // Check if we have new messages by comparing with current state
      setMessages((prevMessages) => {
        // If we have no previous messages, just set the new ones
        if (prevMessages.length === 0) {
          if (newMessages.length > 0) {
            const latestMessage = newMessages[newMessages.length - 1]
            lastMessageIdRef.current = latestMessage.id
            lastTimestampRef.current = latestMessage.timestamp
            console.log("Initial messages loaded via polling:", newMessages.length)
          }
          return newMessages
        }

        // Check if there are actually new messages
        const prevIds = new Set(prevMessages.map((msg) => msg.id))
        const actuallyNewMessages = newMessages.filter((msg) => !prevIds.has(msg.id))

        if (actuallyNewMessages.length > 0) {
          console.log("New messages detected:", actuallyNewMessages.length)

          // Update tracking references
          const latestMessage = newMessages[newMessages.length - 1]
          lastMessageIdRef.current = latestMessage.id
          lastTimestampRef.current = latestMessage.timestamp

          // Return all messages (the server already handles ordering)
          return newMessages
        }

        // No new messages, return previous state
        return prevMessages
      })

      // Clear any connection errors
      if (error) {
        setError(null)
      }
      setIsConnected(true)
    } catch (error) {
      console.log("Polling update failed:", error)
      setIsConnected(false)
      setError("Connection issues. Retrying...")
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !user) return

    try {
      setError(null)
      console.log("Sending message...")

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        body: JSON.stringify({
          text: inputValue.trim(),
          username: user.username,
          displayName: user.displayName,
          profilePicture: user.customProfilePicture || user.profilePicture,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log("Message sent successfully")
        setInputValue("")

        // Send push notifications to other users
        if (!user.isGuest && user.email) {
          try {
            await fetch("/api/notifications/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: inputValue.trim(),
                senderName: user.displayName,
                excludeUser: user.email,
              }),
            })
          } catch (notificationError) {
            console.log("Failed to send push notifications:", notificationError)
          }
        }

        // Immediately poll for updates to get the new message
        setTimeout(() => {
          pollForUpdates()
        }, 100)
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setError("Failed to send message. Please try again.")
    }
  }

  const clearChat = async () => {
    if (!user?.email?.endsWith("@voltaccept.com")) {
      setError("Only @voltaccept.com users can clear the chat.")
      setShowClearModal(false)
      return
    }

    try {
      setError(null)
      const response = await fetch("/api/messages", {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${user.email}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to clear chat")
      }

      // Clear messages locally
      setMessages([])
      lastMessageIdRef.current = null
      lastTimestampRef.current = 0
      setShowClearModal(false)

      console.log("Chat cleared successfully")
    } catch (error: any) {
      console.error("Failed to clear chat:", error)
      setError(error.message || "Failed to clear chat.")
      setShowClearModal(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("chatUser")
    localStorage.removeItem("userPassword")
    router.push("/login")
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

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser)
  }

  // Only show clear button for @voltaccept.com emails
  const canClearChat = user?.email?.endsWith("@voltaccept.com")

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="text-gray-300">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-0">
        <div className="w-full h-screen max-w-none bg-gradient-to-b from-gray-800/85 to-gray-900/85 backdrop-blur-sm border-0 shadow-none flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-b from-gray-700/60 to-gray-800/40 p-4 border-b border-gray-600/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-red-500/50 shadow-sm bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                  <span className="text-sm font-bold text-red-400">VN</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-100">Voltarian Networking</h1>
                  <p className="text-xs text-gray-300">
                    {isConnected ? (
                      <>
                        Connected as {user.displayName}
                        {user.isGuest && <span className="text-yellow-400 ml-1">(Guest)</span>}
                        {canClearChat && <span className="text-red-400 ml-1">(Admin)</span>}
                      </>
                    ) : (
                      "Connecting..."
                    )}
                    {error && <span className="text-red-400 ml-2">({error})</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
                  <div className="text-xs text-gray-400">{messages.length} messages</div>
                </div>
                <PushNotifications user={user} />
                <Button
                  onClick={() => setShowProfileSettings(true)}
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                  title="Profile Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleLogout}
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 bg-gray-900/45 shadow-inner chat-scrollbar">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>Welcome to Voltarian Networking!</p>
                  <p className="text-sm mt-2">Start a conversation by typing a message below.</p>
                  {canClearChat && (
                    <p className="text-xs mt-4 text-red-400">
                      🔑 You have admin privileges - you can clear chat history
                    </p>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="flex flex-col max-w-[75%]">
                    {/* Profile */}
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={message.profilePicture || "/placeholder.svg"}
                        alt={message.displayName}
                        className="w-6 h-6 rounded-full border border-gray-600/50 shadow-sm"
                      />
                      <span className="text-xs font-medium text-gray-200">{message.displayName}</span>
                      <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                    </div>

                    {/* Message */}
                    <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl rounded-tl-sm p-3 shadow-sm">
                      <div className="text-sm text-gray-100 whitespace-pre-wrap break-words">{message.text}</div>
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
            className="p-3 bg-gradient-to-t from-gray-800/70 to-gray-700/70 border-t border-gray-600/50 shadow-sm"
          >
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-gray-800/95 border-gray-600/50 focus:border-red-500 focus:ring-red-500/20 text-sm rounded-xl text-gray-100 placeholder:text-gray-400"
                disabled={!isConnected}
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputValue.trim() || !isConnected}
                  className="h-10 w-10 p-0 bg-gradient-to-b from-gray-700 to-gray-800 hover:from-red-600 hover:to-red-700 border border-gray-600 hover:border-red-500 text-gray-200 hover:text-white shadow-sm rounded-full transition-all duration-200"
                >
                  <Send className="h-4 w-4" />
                </Button>
                {canClearChat && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowClearModal(true)}
                    className="h-10 w-10 p-0 bg-gradient-to-b from-gray-700 to-gray-800 hover:from-red-600 hover:to-red-700 border border-gray-600 hover:border-red-500 text-gray-200 hover:text-white shadow-sm rounded-full transition-all duration-200"
                    title="Clear chat history (Admin only)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Clear Confirmation Modal */}
        {showClearModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-gray-700/50 rounded-xl shadow-xl p-6 max-w-sm mx-4">
              <p className="text-gray-100 mb-4 font-medium">Are you sure you want to clear the chat history?</p>
              <p className="text-gray-400 text-sm mb-4">
                This action cannot be undone and will remove all messages for everyone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setShowClearModal(false)}
                  variant="outline"
                  size="sm"
                  className="bg-gradient-to-b from-gray-700 to-gray-800 border-gray-600 text-gray-200 hover:from-gray-600 hover:to-gray-700 hover:border-gray-500"
                >
                  Cancel
                </Button>
                <Button
                  onClick={clearChat}
                  size="sm"
                  className="bg-gradient-to-b from-red-600 to-red-700 border-red-500 text-white hover:from-red-500 hover:to-red-600 hover:border-red-400"
                >
                  Clear Chat
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Settings Modal */}
        {showProfileSettings && (
          <ProfileSettings user={user} onClose={() => setShowProfileSettings(false)} onUpdate={handleProfileUpdate} />
        )}
      </div>

      {/* Install Prompt */}
      <InstallPrompt />
    </>
  )
}
