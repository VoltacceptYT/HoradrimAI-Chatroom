"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Trash2, LogOut, Settings, RefreshCw } from "lucide-react"
import { InstallPrompt } from "@/components/install-prompt"
import { ProfileSettings } from "@/components/profile-settings"
import { ThemeSelector } from "@/components/theme-selector"

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
  theme?: string
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
  const [isRefreshing, setIsRefreshing] = useState(false)
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

    // Apply saved theme for guests
    const savedTheme = localStorage.getItem("selectedTheme")
    if (savedTheme) {
      applyTheme(savedTheme)
    }
  }, [router])

  // Apply theme function
  const applyTheme = (themeId: string) => {
    const themes = {
      "default-dark": {
        primary: "#ef4444",
        background: "#111827",
        surface: "#1f2937",
        text: "#f9fafb",
      },
      "default-light": {
        primary: "#3b82f6",
        background: "#ffffff",
        surface: "#f8fafc",
        text: "#1f2937",
      },
      "warframe-dark": {
        primary: "#00d4ff",
        background: "#0a0a0f",
        surface: "#1a1a2e",
        text: "#eee6ff",
      },
      "warframe-light": {
        primary: "#14b8a6",
        background: "#f0f9ff",
        surface: "#e0f2fe",
        text: "#0f172a",
      },
      "neon-dark": {
        primary: "#a855f7",
        background: "#0c0a1a",
        surface: "#1e1b3a",
        text: "#f3e8ff",
      },
      "forest-light": {
        primary: "#059669",
        background: "#f7fdf7",
        surface: "#ecfdf5",
        text: "#064e3b",
      },
    }

    const theme = themes[themeId as keyof typeof themes]
    if (!theme) return

    const root = document.documentElement
    root.style.setProperty("--theme-primary", theme.primary)
    root.style.setProperty("--theme-background", theme.background)
    root.style.setProperty("--theme-surface", theme.surface)
    root.style.setProperty("--theme-text", theme.text)

    document.body.className = document.body.className.replace(/theme-\w+/g, "")
    document.body.classList.add(`theme-${themeId}`)
  }

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

      const messageText = inputValue.trim()
      setInputValue("") // Clear input immediately for better UX

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        body: JSON.stringify({
          text: messageText,
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

  const handleThemeChange = (theme: string) => {
    if (user) {
      setUser({ ...user, theme })
    }
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await loadMessages()
    setIsRefreshing(false)
  }

  // Only show clear button for @voltaccept.com emails
  const canClearChat = user?.email?.endsWith("@voltaccept.com")

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen themed-gradient-bg">
        <div className="themed-text">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen themed-gradient-bg flex items-center justify-center p-0">
        <div className="w-full h-screen max-w-none themed-gradient-surface backdrop-blur-sm border-0 shadow-none flex flex-col">
          {/* Header */}
          <div className="themed-header p-4 border-b themed-border shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 shadow-sm themed-gradient-surface flex items-center justify-center"
                  style={{ borderColor: "var(--theme-primary)" }}
                >
                  <span className="text-sm font-bold themed-primary">VN</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold themed-text">Voltarian Networking</h1>
                  <p className="text-xs themed-muted">
                    {isConnected ? (
                      <>
                        Connected as {user.displayName}
                        {user.isGuest && (
                          <span className="ml-1" style={{ color: "var(--theme-primary)" }}>
                            (Guest)
                          </span>
                        )}
                        {canClearChat && (
                          <span className="ml-1" style={{ color: "var(--theme-primary)" }}>
                            (Admin)
                          </span>
                        )}
                      </>
                    ) : (
                      "Connecting..."
                    )}
                    {error && (
                      <span className="ml-2" style={{ color: "var(--theme-primary)" }}>
                        ({error})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full`}
                    style={{ backgroundColor: isConnected ? "#10b981" : "var(--theme-primary)" }}
                  />
                  <div className="text-xs themed-muted">{messages.length} messages</div>
                </div>
                <Button
                  onClick={handleManualRefresh}
                  size="sm"
                  variant="ghost"
                  className="themed-muted hover:themed-text hover:themed-surface"
                  disabled={isRefreshing}
                  title="Refresh messages"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
                <ThemeSelector user={user} onThemeChange={handleThemeChange} />
                <Button
                  onClick={() => setShowProfileSettings(true)}
                  size="sm"
                  variant="ghost"
                  className="themed-muted hover:themed-text hover:themed-surface"
                  title="Profile Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleLogout}
                  size="sm"
                  variant="ghost"
                  className="themed-muted hover:themed-text hover:themed-surface"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-3 shadow-inner chat-scrollbar"
            style={{ backgroundColor: "color-mix(in srgb, var(--theme-background) 45%, transparent)" }}
          >
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center themed-muted py-8">
                  <p>Welcome to Voltarian Networking!</p>
                  <p className="text-sm mt-2">Start a conversation by typing a message below.</p>
                  {canClearChat && (
                    <p className="text-xs mt-4 themed-primary">
                      🔑 You have admin privileges - you can clear chat history
                    </p>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${
                      message.username === user.username ? "ml-auto" : "mr-auto"
                    } max-w-[75%]`}
                  >
                    {/* Profile */}
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={message.profilePicture || "/placeholder.svg?height=40&width=40"}
                        alt={message.displayName}
                        className="w-6 h-6 rounded-full border themed-border shadow-sm"
                      />
                      <span className="text-xs font-medium themed-text">{message.displayName}</span>
                      <span className="text-xs themed-muted">{formatTime(message.timestamp)}</span>
                    </div>

                    {/* Message */}
                    <div
                      className={`backdrop-blur-sm border rounded-xl p-3 shadow-sm ${
                        message.username === user.username
                          ? "themed-message-bubble-own rounded-tr-sm"
                          : "themed-message-bubble rounded-tl-sm"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-3 themed-input-area border-t themed-border shadow-sm">
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none themed-input text-sm rounded-xl"
                disabled={!isConnected}
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputValue.trim() || !isConnected}
                  className="h-10 w-10 p-0 themed-button shadow-sm rounded-full transition-all duration-200"
                >
                  <Send className="h-4 w-4" />
                </Button>
                {canClearChat && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowClearModal(true)}
                    className="h-10 w-10 p-0 themed-button shadow-sm rounded-full transition-all duration-200"
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
            <div className="themed-modal border-2 themed-border rounded-xl shadow-xl p-6 max-w-sm mx-4">
              <p className="themed-text mb-4 font-medium">Are you sure you want to clear the chat history?</p>
              <p className="themed-muted text-sm mb-4">
                This action cannot be undone and will remove all messages for everyone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button onClick={() => setShowClearModal(false)} variant="outline" size="sm" className="themed-button">
                  Cancel
                </Button>
                <Button
                  onClick={clearChat}
                  size="sm"
                  className="themed-button"
                  style={{
                    background: "var(--theme-primary)",
                    borderColor: "var(--theme-primary)",
                    color: "var(--theme-background)",
                  }}
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
