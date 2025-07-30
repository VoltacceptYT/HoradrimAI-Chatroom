"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Camera, Save, X, ImageIcon } from "lucide-react"
import { processProfilePicture, validateImageFile, getCompressionStats } from "@/utils/image-processing"

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

interface ProfileSettingsProps {
  user: User
  onClose: () => void
  onUpdate: (updatedUser: User) => void
}

export function ProfileSettings({ user, onClose, onUpdate }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [bio, setBio] = useState(user.bio || "")
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState("")
  const [compressionStats, setCompressionStats] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate the file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    setIsProcessing(true)
    setProcessingProgress("Validating image...")
    setCompressionStats("")

    try {
      // Show preview immediately
      const previewUrl = URL.createObjectURL(file)
      setProfileImageUrl(previewUrl)

      setProcessingProgress("Compressing image...")

      // Process the image
      const originalSize = file.size
      const processedUrl = await processProfilePicture(file, user.username)

      // Calculate compression stats
      const processedSize = Math.round((processedUrl.length * 3) / 4) // Approximate base64 size
      const stats = getCompressionStats(originalSize, processedSize)
      setCompressionStats(stats)

      // Clean up preview URL
      URL.revokeObjectURL(previewUrl)

      // Set the final URL
      setProfileImageUrl(processedUrl)
      setProcessingProgress("Processing complete!")

      console.log("Profile picture processed successfully")
      console.log(`Original: ${(originalSize / 1024).toFixed(1)}KB → Processed: ${(processedSize / 1024).toFixed(1)}KB`)
    } catch (error) {
      console.error("Failed to process profile picture:", error)
      alert(`Failed to process image: ${error.message}`)
      setProfileImageUrl(null)
      setCompressionStats("")
    } finally {
      setIsProcessing(false)
      setTimeout(() => setProcessingProgress(""), 3000)
    }
  }

  const handleSave = async () => {
    if (!user.email || user.isGuest) {
      alert("Profile customization is only available for registered users")
      return
    }

    setIsLoading(true)

    try {
      const password = localStorage.getItem("userPassword")
      if (!password) {
        throw new Error("Password not found in local storage")
      }

      console.log("Updating profile for:", user.email)

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        body: JSON.stringify({
          email: user.email,
          password: password,
          displayName,
          profilePicture: profileImageUrl,
          bio,
          theme: user.theme || "default-dark",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Profile update failed:", response.status, errorData)
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()
      console.log("Profile updated successfully:", data.user.displayName)

      // Update user data
      const updatedUser = {
        ...user,
        displayName,
        bio,
        customProfilePicture: profileImageUrl,
        profilePicture: profileImageUrl || user.profilePicture,
      }

      // Update localStorage
      localStorage.setItem("chatUser", JSON.stringify(updatedUser))

      onUpdate(updatedUser)
      onClose()
    } catch (error) {
      console.error("Failed to update profile:", error)
      alert(`Failed to update profile: ${error.message || "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const currentProfilePicture = profileImageUrl || user.customProfilePicture || user.profilePicture

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="themed-modal border-2 themed-border rounded-xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold themed-text">Profile Settings</h2>
          <Button onClick={onClose} size="sm" variant="ghost" className="themed-muted hover:themed-text">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={currentProfilePicture || "/placeholder.svg"}
                alt="Profile"
                className="w-24 h-24 rounded-full border-2 themed-border shadow-lg"
                onError={(e) => {
                  // Fallback to default if image fails to load
                  e.currentTarget.src = "/placeholder.svg?height=96&width=96"
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                className="absolute bottom-0 right-0 w-8 h-8 p-0 rounded-full border-2"
                style={{
                  backgroundColor: "var(--theme-primary)",
                  borderColor: "var(--theme-background)",
                  color: "var(--theme-background)",
                }}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isProcessing}
            />
            <p className="text-xs themed-muted mt-2">
              {isProcessing ? processingProgress : "Click camera to change photo"}
            </p>
            {compressionStats && <p className="text-xs themed-primary mt-1">✨ Optimized: {compressionStats}</p>}
            {isProcessing && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: "var(--theme-primary)",
                      width: processingProgress.includes("complete") ? "100%" : "60%",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Display Name */}
          <div>
            <Label htmlFor="displayName" className="themed-text">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others will see you"
              className="mt-1 themed-input"
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio" className="themed-text">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              className="mt-1 themed-input min-h-[80px]"
              maxLength={200}
            />
            <p className="text-xs themed-muted mt-1">{bio.length}/200 characters</p>
          </div>

          {/* User Info */}
          <div className="themed-surface-light rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="themed-muted">Email:</span>
              <span className="themed-text">{user.email || "Guest"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="themed-muted">Username:</span>
              <span className="themed-text">{user.username}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="themed-muted">Role:</span>
              <span className="themed-text">{user.isAdmin ? "Admin" : user.isGuest ? "Guest" : "Member"}</span>
            </div>
          </div>

          {/* Image Processing Info */}
          <div className="themed-surface-light rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-4 w-4 themed-primary" />
              <span className="text-sm font-medium themed-text">Image Processing</span>
            </div>
            <p className="text-xs themed-muted">
              Images are automatically compressed to 200x200px for optimal performance and storage efficiency.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isLoading || user.isGuest || isProcessing}
              className="flex-1"
              style={{
                background: "var(--theme-primary)",
                borderColor: "var(--theme-primary)",
                color: "var(--theme-background)",
              }}
            >
              {isLoading ? (
                <>
                  <div
                    className="w-4 h-4 mr-2 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--theme-background)" }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button onClick={onClose} variant="outline" className="themed-button bg-transparent">
              Cancel
            </Button>
          </div>

          {user.isGuest && (
            <p className="text-xs text-center themed-primary">Register with an email to customize your profile</p>
          )}
        </div>
      </div>
    </div>
  )
}
