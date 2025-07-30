"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Hash, Plus, Users, Settings, LogOut, Copy, Check } from "lucide-react"

interface Server {
  id: string
  name: string
  description: string
  memberCount: number
  userRole: string | null
  joinedAt: number | null
  inviteCode: string
}

interface User {
  username: string
  displayName: string
  email?: string
  isGuest?: boolean
  isAdmin?: boolean
}

interface ServerSelectorProps {
  user: User | null
  currentServerId: string
  onServerChange: (serverId: string) => void
}

export function ServerSelector({ user, currentServerId, onServerChange }: ServerSelectorProps) {
  const [servers, setServers] = useState<Server[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Create server form
  const [serverName, setServerName] = useState("")
  const [serverDescription, setServerDescription] = useState("")

  // Join server form
  const [inviteCode, setInviteCode] = useState("")

  // Invite modal
  const [currentServerInvite, setCurrentServerInvite] = useState("")
  const [inviteCopied, setInviteCopied] = useState(false)

  // Load user's servers
  useEffect(() => {
    if (user && !user.isGuest) {
      loadServers()
    }
  }, [user])

  const loadServers = async () => {
    if (!user?.email) return

    try {
      const response = await fetch(`/api/servers?userEmail=${user.email}`)
      const data = await response.json()

      if (response.ok) {
        setServers(data.servers || [])
      } else {
        console.error("Failed to load servers:", data.error)
      }
    } catch (error) {
      console.error("Error loading servers:", error)
    }
  }

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.email || user.isGuest) return

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/servers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: serverName,
          description: serverDescription,
          userEmail: user.email,
          username: user.username,
          displayName: user.displayName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setServers((prev) => [...prev, data.server])
        setShowCreateModal(false)
        setServerName("")
        setServerDescription("")
        onServerChange(data.server.id)
      } else {
        setError(data.error || "Failed to create server")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinServer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.email || user.isGuest) return

    setIsLoading(true)
    setError("")

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
        setServers((prev) => [...prev, data.server])
        setShowJoinModal(false)
        setInviteCode("")
        onServerChange(data.server.id)
      } else {
        setError(data.error || "Failed to join server")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveServer = async (serverId: string) => {
    if (!user?.email || serverId === "general") return

    if (!confirm("Are you sure you want to leave this server?")) return

    try {
      const response = await fetch("/api/servers", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverId,
          userEmail: user.email,
        }),
      })

      if (response.ok) {
        setServers((prev) => prev.filter((s) => s.id !== serverId))
        if (currentServerId === serverId) {
          onServerChange("general")
        }
      } else {
        const data = await response.json()
        alert(data.error || "Failed to leave server")
      }
    } catch (error) {
      alert("Network error. Please try again.")
    }
  }

  const handleShowInvite = (server: Server) => {
    setCurrentServerInvite(server.inviteCode)
    setShowInviteModal(true)
    setInviteCopied(false)
  }

  const handleCopyInvite = async () => {
    try {
      const inviteUrl = `${window.location.origin}?invite=${currentServerInvite}`
      await navigator.clipboard.writeText(inviteUrl)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = `${window.location.origin}?invite=${currentServerInvite}`
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    }
  }

  const currentServer = servers.find((s) => s.id === currentServerId)

  return (
    <div className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 flex flex-col">
      {/* Current Server Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="font-semibold text-gray-100 truncate">{currentServer?.name || "General Chat"}</h2>
              <p className="text-xs text-gray-400">{currentServer?.memberCount || 0} members</p>
            </div>
          </div>
          {currentServer && currentServer.id !== "general" && (
            <div className="flex gap-1">
              <Button
                onClick={() => handleShowInvite(currentServer)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                title="Invite Link"
              >
                <Users className="h-3 w-3" />
              </Button>
              {currentServer.userRole === "owner" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  title="Server Settings"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              )}
              <Button
                onClick={() => handleLeaveServer(currentServer.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                title="Leave Server"
              >
                <LogOut className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Server List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {servers.map((server) => (
            <button
              key={server.id}
              onClick={() => onServerChange(server.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                currentServerId === server.id
                  ? "bg-red-600/20 border border-red-500/50 text-white"
                  : "hover:bg-gray-700/50 text-gray-300 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{server.name}</div>
                  <div className="text-xs text-gray-400">
                    {server.memberCount} members
                    {server.userRole === "owner" && " • Owner"}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      {!user?.isGuest && (
        <div className="p-2 border-t border-gray-700 space-y-2">
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
            className="w-full bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Server
          </Button>
          <Button
            onClick={() => setShowJoinModal(true)}
            variant="outline"
            className="w-full bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700"
          >
            <Users className="h-4 w-4 mr-2" />
            Join Server
          </Button>
        </div>
      )}

      {user?.isGuest && (
        <div className="p-2 border-t border-gray-700">
          <p className="text-xs text-gray-400 text-center">Register to create and join servers</p>
        </div>
      )}

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Create Server</h2>
            <form onSubmit={handleCreateServer} className="space-y-4">
              <div>
                <Label htmlFor="serverName" className="text-gray-100">
                  Server Name
                </Label>
                <Input
                  id="serverName"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="My Awesome Server"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="serverDescription" className="text-gray-100">
                  Description (Optional)
                </Label>
                <Textarea
                  id="serverDescription"
                  value={serverDescription}
                  onChange={(e) => setServerDescription(e.target.value)}
                  placeholder="What's this server about?"
                  className="mt-1 min-h-[80px]"
                />
              </div>
              {error && <div className="text-sm text-red-400">{error}</div>}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading || !serverName.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? "Creating..." : "Create Server"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setServerName("")
                    setServerDescription("")
                    setError("")
                  }}
                  variant="outline"
                  className="bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Server Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Join Server</h2>
            <form onSubmit={handleJoinServer} className="space-y-4">
              <div>
                <Label htmlFor="inviteCode" className="text-gray-100">
                  Invite Code
                </Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code"
                  className="mt-1"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Enter the invite code shared by a server member</p>
              </div>
              {error && <div className="text-sm text-red-400">{error}</div>}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading || !inviteCode.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? "Joining..." : "Join Server"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false)
                    setInviteCode("")
                    setError("")
                  }}
                  variant="outline"
                  className="bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Invite Friends</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-100">Invite Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={currentServerInvite} readOnly className="flex-1" />
                  <Button onClick={handleCopyInvite} className="bg-red-600 hover:bg-red-700 text-white">
                    {inviteCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Share this code with friends to invite them to the server</p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowInviteModal(false)}
                  variant="outline"
                  className="bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
