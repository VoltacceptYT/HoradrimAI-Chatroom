"use client"

import { useState, useEffect, useRef, useCallback } from "react"

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
  isGuest?: boolean
  isAdmin?: boolean
}

interface UseMessagesOptions {
  user: User | null
  pollingInterval?: number
}

export function useMessages({ user, pollingInterval = 2000 }: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const lastTimestampRef = useRef<number>(0)
  const isInitialLoadRef = useRef(true)

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!user) return

    try {
      setError(null)

      const response = await fetch("/api/messages", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setMessages(data.messages || [])

        // Update last timestamp
        if (data.messages && data.messages.length > 0) {
          const latestMessage = data.messages[data.messages.length - 1]
          lastTimestampRef.current = latestMessage.timestamp
        }

        setIsConnected(true)
        console.log(`Loaded ${data.messages?.length || 0} messages`)
      } else {
        throw new Error(data.error || "Failed to load messages")
      }
    } catch (err) {
      console.error("Failed to load messages:", err)
      setError("Failed to load messages")
      setIsConnected(false)
    } finally {
      setIsLoading(false)
      isInitialLoadRef.current = false
    }
  }, [user])

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    if (!user || isInitialLoadRef.current) return

    try {
      const response = await fetch(`/api/messages?since=${lastTimestampRef.current}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.hasNew && data.messages.length > 0) {
        setMessages((prev) => {
          // Add new messages to existing ones
          const newMessages = [...prev, ...data.messages]

          // Update last timestamp
          const latestMessage = data.messages[data.messages.length - 1]
          lastTimestampRef.current = latestMessage.timestamp

          console.log(`Received ${data.messages.length} new messages`)
          return newMessages
        })
      }

      // Clear any connection errors
      if (error) {
        setError(null)
      }
      setIsConnected(true)
    } catch (err) {
      console.error("Polling failed:", err)
      setIsConnected(false)
      setError("Connection issues")
    }
  }, [user, error])

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!user || !text.trim() || isSending) return false

      setIsSending(true)
      setError(null)

      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({
            text: text.trim(),
            username: user.username,
            displayName: user.displayName,
            profilePicture: user.customProfilePicture || user.profilePicture,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          // Add the new message immediately to the local state
          setMessages((prev) => [...prev, data.message])
          lastTimestampRef.current = data.message.timestamp

          console.log("Message sent successfully")
          return true
        } else {
          throw new Error(data.error || "Failed to send message")
        }
      } catch (err) {
        console.error("Failed to send message:", err)
        setError("Failed to send message")
        return false
      } finally {
        setIsSending(false)
      }
    },
    [user, isSending],
  )

  // Clear chat (admin only)
  const clearChat = useCallback(async () => {
    if (!user?.email?.endsWith("@voltaccept.com")) {
      setError("Only @voltaccept.com users can clear the chat")
      return false
    }

    try {
      setError(null)

      const response = await fetch("/api/messages", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.email}`,
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to clear chat")
      }

      const data = await response.json()

      if (data.success) {
        setMessages([])
        lastTimestampRef.current = 0
        console.log(`Chat cleared - ${data.cleared} messages removed`)
        return true
      } else {
        throw new Error(data.error || "Failed to clear chat")
      }
    } catch (err) {
      console.error("Failed to clear chat:", err)
      setError(err.message || "Failed to clear chat")
      return false
    }
  }, [user])

  // Refresh messages manually
  const refreshMessages = useCallback(async () => {
    setIsLoading(true)
    await loadMessages()
  }, [loadMessages])

  // Set up polling
  useEffect(() => {
    if (!user) return

    // Load initial messages
    loadMessages()

    // Start polling for new messages
    pollingRef.current = setInterval(pollMessages, pollingInterval)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [user, loadMessages, pollMessages, pollingInterval])

  return {
    messages,
    isLoading,
    isConnected,
    error,
    isSending,
    sendMessage,
    clearChat,
    refreshMessages,
  }
}
