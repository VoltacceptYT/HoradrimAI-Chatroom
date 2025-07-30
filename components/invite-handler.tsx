"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

interface User {
  username: string
  displayName: string
  email?: string
  isGuest?: boolean
}

interface InviteHandlerProps {
  user: User | null
  onServerChange: (serverId: string) => void
}

export function InviteHandler({ user, onServerChange }: InviteHandlerProps) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const inviteCode = searchParams.get("invite")
    if (inviteCode && user && !user.isGuest) {
      handleInviteLink(inviteCode)
    }
  }, [searchParams, user])

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
          inviteCode,
          userEmail: user.email,
          username: user.username,
          displayName: user.displayName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onServerChange(data.server.id)
        // Remove invite from URL
        window.history.replaceState({}, document.title, window.location.pathname)
      } else {
        alert(data.error || "Failed to join server")
      }
    } catch (error) {
      alert("Failed to process invite link")
    }
  }

  return null // This component doesn't render anything
}
