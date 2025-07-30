"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Trash2, LogOut, Settings, RefreshCw } from "lucide-react"
import { InstallPrompt } from "@/components/install-prompt"
import { ProfileSettings } from "@/components/profile-settings"
import { ServerSelector } from "@/components/server-selector"
import { ProfileViewer } from "@/components/profile-viewer"
import { useMessages } from "@/hooks/use-messages"
import { InviteHandler } from "@/components/invite-handler"

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
  const [inputValue, setInputValue] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [currentServerId, setCurrentServerId] = useState("general")
  const [showClearModal, setShowClearModal] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [profileViewerUsername, setProfileViewerUsername] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Use the messages hook with current server
  const { messages, isLoading, isConnected, error, isSending, sendMessage, clearChat, refreshMessages } = useMessages({
    user,
    serverId: currentServerId,
    pollingInterval: 1500,
  })

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isSending) return

    const messageText = inputValue.trim()
    setInputValue("") // Clear input immediately

    const success = await sendMessage(messageText)
    if (!success) {
      // Restore input if sending failed
      setInputValue(messageText)
    }
  }

  const handleClearChat = async () => {
    const success = await clearChat()
    setShowClearModal(false)

    if (success) {
      console.log("Chat cleared successfully")
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
      handleSendMessage(e)
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

  const handleViewProfile = (username: string) => {
    setProfileViewerUsername(username)
  }

  // Handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    // Fallback to a default placeholder
    img.src = "/placeholder.svg?height=24&width=24"
  }

  // Only show clear button for @voltaccept.com emails
  const canClearChat = user?.email?.endsWith("@voltaccept.com")

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="text-gray-100">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex">
        <InviteHandler user={user} onServerChange={setCurrentServerId} />
        {/* Server Selector Sidebar */}
        <ServerSelector user={user} currentServerId={currentServerId} onServerChange={setCurrentServerId} />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-b from-gray-800/60 to-gray-900/40 backdrop-blur-sm p-4 border-b border-gray-700/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-red-500 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-red-400">VN</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-100">Voltarian Networking</h1>
                  <p className="text-xs text-gray-400">
                    {isLoading ? (
                      "Loading..."
                    ) : isConnected ? (
                      <>
                        Connected as {user.displayName}
                        {user.isGuest && <span className="ml-1 text-red-400">(Guest)</span>}
                        {canClearChat && <span className="ml-1 text-red-400">(Admin)</span>}
                      </>
                    ) : (
                      "Connecting..."
                    )}
                    {error && <span className="ml-2 text-red-400">({error})</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                  <div className="text-xs text-gray-400">{messages.length} messages</div>
                </div>
                <Button
                  onClick={refreshMessages}
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                  disabled={isLoading}
                  title="Refresh messages"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
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
          <div className="flex-1 overflow-y-auto p-3 shadow-inner chat-scrollbar bg-gray-900/45">
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-2" />
                  <p>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>Welcome to this server!</p>
                  <p className="text-sm mt-2">Start a conversation by typing a message below.</p>
                  {canClearChat && (
                    <p className="text-xs mt-4 text-red-400">
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
                      <button
                        onClick={() => handleViewProfile(message.username)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={message.profilePicture || "/placeholder.svg?height=24&width=24"}
                          alt={message.displayName}
                          className="w-6 h-6 rounded-full border border-gray-600 shadow-sm"
                          onError={handleImageError}
                          loading="lazy"
                        />
                        <span className="text-xs font-medium text-gray-100 hover:text-red-400 transition-colors">
                          {message.displayName}
                        </span>
                      </button>
                      <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                    </div>

                    {/* Message */}
                    <div
                      className={`backdrop-blur-sm border rounded-xl p-3 shadow-sm ${
                        message.username === user.username
                          ? "bg-gradient-to-br from-red-600/80 to-red-700/60 border-red-500/50 text-white rounded-tr-sm"
                          : "bg-gradient-to-br from-gray-700/80 to-gray-800/60 border-gray-600/50 text-gray-100 rounded-tl-sm"
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
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-gradient-to-t from-gray-800/70 to-gray-900/40 backdrop-blur-sm border-t border-gray-700/50 shadow-sm"
          >
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl"
                disabled={!isConnected || isSending}
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputValue.trim() || !isConnected || isSending}
                  className="h-10 w-10 p-0 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500 text-white shadow-sm rounded-full transition-all duration-200"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
                {canClearChat && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowClearModal(true)}
                    className="h-10 w-10 p-0 bg-gradient-to-b from-gray-700 to-gray-800 border-gray-600 text-gray-200 hover:from-gray-600 hover:to-gray-700 shadow-sm rounded-full transition-all duration-200"
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
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-gray-700 rounded-xl shadow-xl p-6 max-w-sm mx-4">
              <p className="text-gray-100 mb-4 font-medium">Are you sure you want to clear the chat history?</p>
              <p className="text-gray-400 text-sm mb-4">
                This action cannot be undone and will remove all messages for everyone in this server.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setShowClearModal(false)}
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button onClick={handleClearChat} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
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

        {/* Profile Viewer Modal */}
        {profileViewerUsername && (
          <ProfileViewer username={profileViewerUsername} onClose={() => setProfileViewerUsername(null)} />
        )}
      </div>

      {/* Install Prompt */}
      <InstallPrompt />
    </>
  )
}
