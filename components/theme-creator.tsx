"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Save, RefreshCw } from "lucide-react"

interface User {
  username: string
  displayName: string
  email?: string
  profilePicture: string
  customProfilePicture?: string
  bio?: string
  theme?: string
  customThemes?: CustomTheme[]
  isGuest?: boolean
  isAdmin?: boolean
}

interface CustomTheme {
  id: string
  name: string
  primary: string
  background: string
  surface: string
  text: string
  createdAt: number
}

interface ThemeCreatorProps {
  user: User | null
  onClose: () => void
  onSave: (theme: CustomTheme) => void
}

export function ThemeCreator({ user, onClose, onSave }: ThemeCreatorProps) {
  const [themeName, setThemeName] = useState("My Custom Theme")
  const [primaryColor, setPrimaryColor] = useState("#ef4444")
  const [backgroundColor, setBackgroundColor] = useState("#111827")
  const [surfaceColor, setSurfaceColor] = useState("#1f2937")
  const [textColor, setTextColor] = useState("#f9fafb")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  // Apply theme preview in real-time
  useEffect(() => {
    // Save current theme to restore later
    const root = document.documentElement
    const originalPrimary = root.style.getPropertyValue("--theme-primary")
    const originalBackground = root.style.getPropertyValue("--theme-background")
    const originalSurface = root.style.getPropertyValue("--theme-surface")
    const originalText = root.style.getPropertyValue("--theme-text")

    // Apply preview theme
    root.style.setProperty("--theme-primary", primaryColor)
    root.style.setProperty("--theme-background", backgroundColor)
    root.style.setProperty("--theme-surface", surfaceColor)
    root.style.setProperty("--theme-text", textColor)

    // Restore original theme when component unmounts
    return () => {
      root.style.setProperty("--theme-primary", originalPrimary)
      root.style.setProperty("--theme-background", originalBackground)
      root.style.setProperty("--theme-surface", originalSurface)
      root.style.setProperty("--theme-text", originalText)
    }
  }, [primaryColor, backgroundColor, surfaceColor, textColor])

  const handleRandomize = () => {
    // Generate random colors
    const randomHex = () => {
      const letters = "0123456789ABCDEF"
      let color = "#"
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
      }
      return color
    }

    setPrimaryColor(randomHex())
    setBackgroundColor(randomHex())
    setSurfaceColor(randomHex())
    setTextColor(randomHex())
  }

  const handleSave = async () => {
    if (!themeName.trim()) {
      setError("Please enter a theme name")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const newTheme: CustomTheme = {
        id: `custom_${Date.now()}`,
        name: themeName.trim(),
        primary: primaryColor,
        background: backgroundColor,
        surface: surfaceColor,
        text: textColor,
        createdAt: Date.now(),
      }

      // For registered users, save to profile
      if (user && !user.isGuest && user.email) {
        const password = localStorage.getItem("userPassword")
        if (!password) {
          throw new Error("Authentication required")
        }

        // Get existing custom themes
        const existingThemes = user.customThemes || []

        // Add new theme
        const updatedThemes = [...existingThemes, newTheme]

        // Update user profile
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            password: password,
            customThemes: updatedThemes,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to save theme to profile")
        }
      }

      // For all users, also save to localStorage
      const savedThemes = JSON.parse(localStorage.getItem("customThemes") || "[]")
      savedThemes.push(newTheme)
      localStorage.setItem("customThemes", JSON.stringify(savedThemes))

      // Notify parent component
      onSave(newTheme)
      onClose()
    } catch (error) {
      console.error("Failed to save custom theme:", error)
      setError(error.message || "Failed to save theme")
    } finally {
      setIsSaving(false)
    }
  }

  const isLightBackground = () => {
    // Convert hex to RGB and check luminance
    const hex = backgroundColor.replace("#", "")
    const r = Number.parseInt(hex.substr(0, 2), 16)
    const g = Number.parseInt(hex.substr(2, 2), 16)
    const b = Number.parseInt(hex.substr(4, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border-2"
        style={{
          backgroundColor: backgroundColor,
          color: textColor,
          borderColor: primaryColor,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: textColor }}>
            Create Custom Theme
          </h2>
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            style={{ color: textColor }}
            className="hover:bg-opacity-20 hover:bg-gray-500"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Theme Name */}
          <div>
            <Label htmlFor="themeName" style={{ color: textColor }}>
              Theme Name
            </Label>
            <Input
              id="themeName"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="My Awesome Theme"
              className="mt-1"
              style={{
                backgroundColor: surfaceColor,
                color: textColor,
                borderColor: primaryColor,
              }}
            />
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryColor" style={{ color: textColor }}>
                Primary Color
              </Label>
              <div className="flex mt-1">
                <div
                  className="w-10 h-10 rounded-l-md border-y border-l"
                  style={{
                    backgroundColor: primaryColor,
                    borderColor: surfaceColor,
                  }}
                />
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full rounded-l-none"
                  style={{
                    backgroundColor: surfaceColor,
                    color: textColor,
                    borderColor: surfaceColor,
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="backgroundColor" style={{ color: textColor }}>
                Background Color
              </Label>
              <div className="flex mt-1">
                <div
                  className="w-10 h-10 rounded-l-md border-y border-l"
                  style={{
                    backgroundColor: backgroundColor,
                    borderColor: surfaceColor,
                  }}
                />
                <Input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-full rounded-l-none"
                  style={{
                    backgroundColor: surfaceColor,
                    color: textColor,
                    borderColor: surfaceColor,
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="surfaceColor" style={{ color: textColor }}>
                Surface Color
              </Label>
              <div className="flex mt-1">
                <div
                  className="w-10 h-10 rounded-l-md border-y border-l"
                  style={{
                    backgroundColor: surfaceColor,
                    borderColor: surfaceColor,
                  }}
                />
                <Input
                  id="surfaceColor"
                  type="color"
                  value={surfaceColor}
                  onChange={(e) => setSurfaceColor(e.target.value)}
                  className="w-full rounded-l-none"
                  style={{
                    backgroundColor: surfaceColor,
                    color: textColor,
                    borderColor: surfaceColor,
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="textColor" style={{ color: textColor }}>
                Text Color
              </Label>
              <div className="flex mt-1">
                <div
                  className="w-10 h-10 rounded-l-md border-y border-l"
                  style={{
                    backgroundColor: textColor,
                    borderColor: surfaceColor,
                  }}
                />
                <Input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full rounded-l-none"
                  style={{
                    backgroundColor: surfaceColor,
                    color: textColor,
                    borderColor: surfaceColor,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: surfaceColor,
              borderColor: primaryColor,
            }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>
              Theme Preview
            </h3>
            <div className="flex gap-2 mb-3">
              <div
                className="px-3 py-1 rounded-md text-sm"
                style={{
                  backgroundColor: primaryColor,
                  color: isLightBackground() ? "#000000" : "#ffffff",
                }}
              >
                Primary Button
              </div>
              <div
                className="px-3 py-1 rounded-md text-sm border"
                style={{
                  backgroundColor: surfaceColor,
                  borderColor: primaryColor,
                  color: textColor,
                }}
              >
                Secondary Button
              </div>
            </div>
            <div
              className="p-3 rounded-md border mb-3"
              style={{
                backgroundColor: backgroundColor,
                borderColor: surfaceColor,
                color: textColor,
              }}
            >
              This is how your background will look
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span style={{ color: isLightBackground() ? "#000000" : "#ffffff" }}>VN</span>
              </div>
              <span style={{ color: textColor }}>Voltarian Networking</span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-center" style={{ color: primaryColor }}>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleRandomize}
              variant="outline"
              className="flex-1 bg-transparent"
              style={{
                backgroundColor: "transparent",
                borderColor: primaryColor,
                color: textColor,
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Randomize
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !themeName.trim()}
              className="flex-1"
              style={{
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                color: isLightBackground() ? "#000000" : "#ffffff",
              }}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Theme
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center" style={{ color: textColor }}>
            {user?.isGuest ? "Custom themes are saved locally for guests" : "Theme will be saved to your profile"}
          </p>
        </div>
      </div>
    </div>
  )
}
