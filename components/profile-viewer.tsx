"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Calendar, Hash, Shield } from "lucide-react"

interface PublicUser {
  username: string
  displayName: string
  profilePicture: string
  bio: string
  joinDate: number
  serverCount: number
  isAdmin: boolean
}

interface ProfileViewerProps {
  username: string
  onClose: () => void
}

export function ProfileViewer({ username, onClose }: ProfileViewerProps) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadUserProfile()
  }, [username])

  const loadUserProfile = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/users/${username}`)
      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
      } else {
        setError(data.error || "Failed to load profile")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 30) return `${days} days ago`
    if (days < 365) return `${Math.floor(days / 30)} months ago`
    return `${Math.floor(days / 365)} years ago`
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-100">User Profile</h2>
          <Button onClick={onClose} size="sm" variant="ghost" className="text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Loading profile...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Button
              onClick={loadUserProfile}
              variant="outline"
              className="bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700"
            >
              Try Again
            </Button>
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* Profile Picture and Basic Info */}
            <div className="text-center">
              <img
                src={user.profilePicture || "/placeholder.svg?height=96&width=96"}
                alt={user.displayName}
                className="w-24 h-24 rounded-full border-2 border-gray-600 shadow-lg mx-auto mb-4"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=96&width=96"
                }}
              />
              <div className="flex items-center justify-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-gray-100">{user.displayName}</h3>
                {user.isAdmin && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-600/20 border border-red-500/50 rounded-full">
                    <Shield className="h-3 w-3 text-red-400" />
                    <span className="text-xs text-red-400 font-medium">Admin</span>
                  </div>
                )}
              </div>
              <p className="text-gray-400">@{user.username}</p>
            </div>

            {/* Bio */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-100 mb-2">About</h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                {user.bio || "This user hasn't written a bio yet."}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-100">Servers</span>
                </div>
                <p className="text-2xl font-bold text-white">{user.serverCount}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-100">Joined</span>
                </div>
                <p className="text-sm font-semibold text-white">{getTimeAgo(user.joinDate)}</p>
              </div>
            </div>

            {/* Member Since */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-100 mb-2">Member Since</h4>
              <p className="text-gray-300 text-sm">{formatDate(user.joinDate)}</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
              <Button
                onClick={onClose}
                variant="outline"
                className="bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
