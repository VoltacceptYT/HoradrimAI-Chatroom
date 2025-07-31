"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Trash2, LogOut, Settings, RefreshCw, AtSign, Users } from "lucide-react"
import { InstallPrompt } from "@/components/install-prompt"
import { ProfileSettings } from "@/components/profile-settings"
import { ServerSelector } from "@/components/server-selector"
import { ProfileViewer } from "@/components/profile-viewer"
import { useMessages } from "@/hooks/use-messages"

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
  const [userSuggestions, setUserSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showOnlineUsers, setShowOnlineUsers] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Use the messages hook with current server
  const { messages, onlineUsers, isLoading, isConnected, error, isSending, sendMessage, clearChat, refreshMessages } =
    useMessages({
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

  // Handle invite links
  useEffect(() => {
    const inviteCode = searchParams.get("invite")
    if (inviteCode && user && !user.isGuest) {
      handleInviteLink(inviteCode)
    }
  }, [searchParams, user])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleInviteLink = async (inviteCode: string) => {
    if (!user?.email || user.isGuest) {
      alert("Please register to join servers via invite links")
      return
    }

    try {
      const response = await fetch("/api/servers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
          userEmail: user.email,
          username: user.username,
          displayName: user.displayName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentServerId(data.server.id)
        // Remove invite from URL
        window.history.replaceState({}, document.title, window.location.pathname)
        alert(`Successfully joined ${data.server.name}!`)
      } else {
        alert(data.error || "Failed to join server")
      }
    } catch (error) {
      console.error("Failed to process invite link:", error)
      alert("Failed to process invite link")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = value.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)

      // Only show suggestions if there's no space after @
      if (!textAfterAt.includes(" ") && textAfterAt.length >= 0) {
        // Filter online users only (excluding current user)
        const availableUsers = onlineUsers.filter((username) => username !== user?.username)
        const matchingUsers = availableUsers.filter((username) =>
          username.toLowerCase().includes(textAfterAt.toLowerCase()),
        )
        setUserSuggestions(matchingUsers.slice(0, 5))
        setShowSuggestions(matchingUsers.length > 0)
      } else {
        setShowSuggestions(false)
      }
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (username: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = inputValue.substring(0, cursorPosition)
    const textAfterCursor = inputValue.substring(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex !== -1) {
      const newValue = textBeforeCursor.substring(0, lastAtIndex) + `@${username} ` + textAfterCursor

      setInputValue(newValue)
      setShowSuggestions(false)

      // Focus back to textarea
      setTimeout(() => {
        textareaRef.current?.focus()
        const newCursorPos = lastAtIndex + username.length + 2
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

  const renderMessageWithMentions = (text: string, currentUsername?: string) => {
    // Split text by @ mentions
    const parts = text.split(/(@\w+)/g)

    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const mentionedUser = part.substring(1)
        const isSelfMention = mentionedUser === currentUsername

        return (
          <span
            key={index}
            className={`font-semibold px-1 py-0.5 rounded cursor-pointer ${
              isSelfMention
                ? "bg-red-500/30 text-red-300 border border-red-500/50"
                : "bg-blue-500/30 text-blue-300 border border-blue-500/50"
            }`}
            onClick={() => handleViewProfile(mentionedUser)}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isSending) return

    const messageText = inputValue.trim()
    setInputValue("") // Clear input immediately
    setShowSuggestions(false)

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
    if (showSuggestions && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault()
      // Handle suggestion navigation (simplified for now)
      if (e.key === "Enter" && userSuggestions.length > 0) {
        handleSuggestionClick(userSuggestions[0])
      }
      return
    }

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
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-red-500 bg-gradient-to-br from-gray-700 to-gray-800 shadow-sm flex items-center justify-center">
            <span className="text-2xl font-bold text-red-400">VN</span>
          </div>
          <div className="text-gray-100 mb-2">Loading...</div>
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex">
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
                  onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-gray-700 relative"
                  title={`${onlineUsers.length} online users`}
                >
                  <Users className="h-4 w-4" />
                  {onlineUsers.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {onlineUsers.length}
                    </span>
                  )}
                </Button>
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

            {/* Online Users Dropdown */}
            {showOnlineUsers && (
              <div className="absolute right-4 top-16 bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 z-10 min-w-48">
                <h3 className="text-sm font-semibold text-gray-100 mb-2">Online Users ({onlineUsers.length})</h3>
                {onlineUsers.length > 0 ? (
                  <div className="space-y-1">
                    {onlineUsers.map((username) => (
                      <button
                        key={username}
                        onClick={() => {
                          handleViewProfile(username)
                          setShowOnlineUsers(false)
                        }}
                        className="w-full text-left px-2 py-1 hover:bg-gray-700/50 text-gray-200 text-sm rounded transition-colors flex items-center gap-2"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {username}
                        {username === user.username && <span className="text-xs text-gray-400">(you)</span>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No users currently online</p>
                )}
              </div>
            )}
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
                  <p className="text-xs mt-2 text-blue-400">💡 Tip: Use @username to mention online users</p>
                  {onlineUsers.length > 0 && (
                    <p className="text-xs mt-1 text-green-400">
                      🟢 {onlineUsers.length} user{onlineUsers.length !== 1 ? "s" : ""} online
                    </p>
                  )}
                  {canClearChat && (
                    <p className="text-xs mt-4 text-red-400">
                      🔑 You have admin privileges - you can clear chat history
                    </p>
                  )}
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.username === user.username
                  const isMentioned = message.text.includes(`@${user.username}`)

                  return (
                    <div
                      key={message.id}
                      className={`flex flex-col ${
                        isOwnMessage ? "ml-auto" : "mr-auto"
                      } max-w-[75%] ${isMentioned ? "ring-2 ring-red-500/50 ring-offset-2 ring-offset-gray-900" : ""}`}
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
                          <span className="text-xs font-medium text-gray-100 hover:text-red-400 transition-colors flex items-center gap-1">
                            {message.displayName}
                            {onlineUsers.includes(message.username) && (
                              <div className="w-2 h-2 rounded-full bg-green-500" title="Online" />
                            )}
                          </span>
                        </button>
                        <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                        {isMentioned && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-1 py-0.5 rounded border border-red-500/50">
                            mentioned you
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      <div
                        className={`backdrop-blur-sm border rounded-xl p-3 shadow-sm ${
                          isOwnMessage
                            ? "bg-gradient-to-br from-red-600/80 to-red-700/60 border-red-500/50 text-white rounded-tr-sm"
                            : isMentioned
                              ? "bg-gradient-to-br from-red-900/40 to-red-800/30 border-red-500/50 text-gray-100 rounded-tl-sm"
                              : "bg-gradient-to-br from-gray-700/80 to-gray-800/60 border-gray-600/50 text-gray-100 rounded-tl-sm"
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {renderMessageWithMentions(message.text, user.username)}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-gradient-to-t from-gray-800/70 to-gray-900/40 backdrop-blur-sm border-t border-gray-700/50 shadow-sm relative"
          >
            {/* User Suggestions */}
            {showSuggestions && userSuggestions.length > 0 && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-32 overflow-y-auto z-10">
                <div className="px-3 py-2 border-b border-gray-700">
                  <span className="text-xs text-gray-400">Online users you can mention:</span>
                </div>
                {userSuggestions.map((username, index) => (
                  <button
                    key={username}
                    type="button"
                    onClick={() => handleSuggestionClick(username)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-700/50 text-gray-200 text-sm flex items-center gap-2 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <AtSign className="h-3 w-3 text-gray-400" />
                    {username}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  onlineUsers.length > 0
                    ? "Type your message... (use @username to mention online users)"
                    : "Type your message here..."
                }
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
