"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Palette, Check, Plus, Trash } from "lucide-react"
import { ThemeCreator } from "@/components/theme-creator"

interface CustomTheme {
  id: string
  name: string
  primary: string
  background: string
  surface: string
  text: string
  createdAt: number
}

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

interface ThemeSelectorProps {
  user: User | null
  onThemeChange: (theme: string) => void
}

const builtInThemes = [
  {
    id: "default-dark",
    name: "Default - Dark",
    description: "Classic dark theme with red accents",
    colors: {
      primary: "#ef4444",
      background: "#111827",
      surface: "#1f2937",
      text: "#f9fafb",
    },
  },
  {
    id: "default-light",
    name: "Default - Light",
    description: "Clean light theme with blue accents",
    colors: {
      primary: "#3b82f6",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#1f2937",
    },
  },
  {
    id: "warframe-dark",
    name: "Warframe - Dark",
    description: "Cyberpunk dark theme with cyan accents",
    colors: {
      primary: "#00d4ff",
      background: "#0a0a0f",
      surface: "#1a1a2e",
      text: "#eee6ff",
    },
  },
  {
    id: "warframe-light",
    name: "Warframe - Light",
    description: "Futuristic light theme with teal accents",
    colors: {
      primary: "#14b8a6",
      background: "#f0f9ff",
      surface: "#e0f2fe",
      text: "#0f172a",
    },
  },
  {
    id: "neon-dark",
    name: "Neon - Dark",
    description: "Vibrant neon theme with purple accents",
    colors: {
      primary: "#a855f7",
      background: "#0c0a1a",
      surface: "#1e1b3a",
      text: "#f3e8ff",
    },
  },
  {
    id: "forest-light",
    name: "Forest - Light",
    description: "Natural theme with green accents",
    colors: {
      primary: "#059669",
      background: "#f7fdf7",
      surface: "#ecfdf5",
      text: "#064e3b",
    },
  },
]

export function ThemeSelector({ user, onThemeChange }: ThemeSelectorProps) {
  const [showThemes, setShowThemes] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(user?.theme || "default-dark")
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([])
  const [showThemeCreator, setShowThemeCreator] = useState(false)

  useEffect(() => {
    // Load custom themes from user profile or localStorage
    loadCustomThemes()

    if (user?.theme) {
      setCurrentTheme(user.theme)
      applyTheme(user.theme)
    }
  }, [user])

  const loadCustomThemes = () => {
    let themes: CustomTheme[] = []

    // First try to get from user profile
    if (user?.customThemes && Array.isArray(user.customThemes)) {
      themes = [...user.customThemes]
    }

    // Then try to get from localStorage (and merge with user themes)
    try {
      const localThemes = JSON.parse(localStorage.getItem("customThemes") || "[]")
      if (Array.isArray(localThemes)) {
        // Merge themes, avoiding duplicates by ID
        const existingIds = new Set(themes.map((t) => t.id))
        localThemes.forEach((theme: CustomTheme) => {
          if (!existingIds.has(theme.id)) {
            themes.push(theme)
          }
        })
      }
    } catch (error) {
      console.error("Failed to load custom themes from localStorage:", error)
    }

    setCustomThemes(themes)
  }

  const applyTheme = (themeId: string) => {
    // Check if it's a built-in theme
    const builtInTheme = builtInThemes.find((t) => t.id === themeId)

    if (builtInTheme) {
      const root = document.documentElement
      root.style.setProperty("--theme-primary", builtInTheme.colors.primary)
      root.style.setProperty("--theme-background", builtInTheme.colors.background)
      root.style.setProperty("--theme-surface", builtInTheme.colors.surface)
      root.style.setProperty("--theme-text", builtInTheme.colors.text)

      // Apply theme class to body
      document.body.className = document.body.className.replace(/theme-\w+/g, "")
      document.body.classList.add(`theme-${themeId}`)
      return
    }

    // Check if it's a custom theme
    const customTheme = customThemes.find((t) => t.id === themeId)

    if (customTheme) {
      const root = document.documentElement
      root.style.setProperty("--theme-primary", customTheme.primary)
      root.style.setProperty("--theme-background", customTheme.background)
      root.style.setProperty("--theme-surface", customTheme.surface)
      root.style.setProperty("--theme-text", customTheme.text)

      // Apply custom theme class to body
      document.body.className = document.body.className.replace(/theme-\w+/g, "")
      document.body.classList.add(`theme-custom`)
    }
  }

  const handleThemeSelect = async (themeId: string) => {
    setCurrentTheme(themeId)
    applyTheme(themeId)
    setShowThemes(false)

    // Update user's theme preference
    if (user && !user.isGuest && user.email) {
      try {
        const password = localStorage.getItem("userPassword")
        if (password) {
          const response = await fetch("/api/profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: user.email,
              password: password,
              theme: themeId,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            const updatedUser = { ...user, theme: themeId }
            localStorage.setItem("chatUser", JSON.stringify(updatedUser))
            onThemeChange(themeId)
          }
        }
      } catch (error) {
        console.error("Failed to save theme preference:", error)
      }
    } else {
      // For guests, just save to localStorage
      localStorage.setItem("selectedTheme", themeId)
      onThemeChange(themeId)
    }
  }

  const handleSaveCustomTheme = (theme: CustomTheme) => {
    // Add to custom themes
    setCustomThemes((prev) => [...prev, theme])

    // Apply the new theme
    handleThemeSelect(theme.id)
  }

  const handleDeleteCustomTheme = async (themeId: string) => {
    // Remove from state
    const updatedThemes = customThemes.filter((t) => t.id !== themeId)
    setCustomThemes(updatedThemes)

    // If current theme is being deleted, switch to default
    if (currentTheme === themeId) {
      handleThemeSelect("default-dark")
    }

    // Update localStorage
    localStorage.setItem("customThemes", JSON.stringify(updatedThemes))

    // Update user profile if logged in
    if (user && !user.isGuest && user.email) {
      try {
        const password = localStorage.getItem("userPassword")
        if (password) {
          await fetch("/api/profile", {
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
        }
      } catch (error) {
        console.error("Failed to update custom themes in profile:", error)
      }
    }
  }

  const getCurrentThemeData = () => {
    // Check built-in themes first
    const builtIn = builtInThemes.find((t) => t.id === currentTheme)
    if (builtIn) return builtIn

    // Then check custom themes
    const custom = customThemes.find((t) => t.id === currentTheme)
    if (custom) {
      return {
        id: custom.id,
        name: custom.name,
        description: "Custom theme",
        colors: {
          primary: custom.primary,
          background: custom.background,
          surface: custom.surface,
          text: custom.text,
        },
      }
    }

    // Default fallback
    return builtInThemes[0]
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setShowThemes(!showThemes)}
        size="sm"
        variant="ghost"
        className="text-gray-400 hover:text-white hover:bg-gray-700"
        title="Change Theme"
      >
        <Palette className="h-4 w-4" />
      </Button>

      {showThemes && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-xl p-4 z-50">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Choose Theme</h3>

          {/* Built-in Themes */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h4 className="text-xs uppercase text-gray-400 font-semibold mb-2">Built-in Themes</h4>
            {builtInThemes.map((theme) => (
              <div
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  currentTheme === theme.id
                    ? "border-red-500 bg-red-500/10"
                    : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-100">{theme.name}</span>
                  {currentTheme === theme.id && <Check className="h-4 w-4 text-red-400" />}
                </div>
                <p className="text-xs text-gray-400 mb-3">{theme.description}</p>
                <div className="flex gap-2">
                  <div
                    className="w-6 h-6 rounded-full border border-gray-600"
                    style={{ backgroundColor: theme.colors.primary }}
                    title="Primary Color"
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-gray-600"
                    style={{ backgroundColor: theme.colors.background }}
                    title="Background Color"
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-gray-600"
                    style={{ backgroundColor: theme.colors.surface }}
                    title="Surface Color"
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-gray-600"
                    style={{ backgroundColor: theme.colors.text }}
                    title="Text Color"
                  />
                </div>
              </div>
            ))}

            {/* Custom Themes */}
            {customThemes.length > 0 && (
              <>
                <h4 className="text-xs uppercase text-gray-400 font-semibold mt-4 mb-2">Your Custom Themes</h4>
                {customThemes.map((theme) => (
                  <div
                    key={theme.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      currentTheme === theme.id
                        ? "border-red-500 bg-red-500/10"
                        : "border-gray-600 hover:border-gray-500 hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-100">{theme.name}</span>
                        <span className="text-xs text-gray-400">custom</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {currentTheme === theme.id && <Check className="h-4 w-4 text-red-400" />}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCustomTheme(theme.id)
                          }}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-1">
                      <div
                        className="w-6 h-6 rounded-full border border-gray-600"
                        style={{ backgroundColor: theme.primary }}
                        title="Primary Color"
                      />
                      <div
                        className="w-6 h-6 rounded-full border border-gray-600"
                        style={{ backgroundColor: theme.background }}
                        title="Background Color"
                      />
                      <div
                        className="w-6 h-6 rounded-full border border-gray-600"
                        style={{ backgroundColor: theme.surface }}
                        title="Surface Color"
                      />
                      <div
                        className="w-6 h-6 rounded-full border border-gray-600"
                        style={{ backgroundColor: theme.text }}
                        title="Text Color"
                      />
                    </div>
                    <div
                      className="flex justify-center items-center mt-2 p-1 rounded text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleThemeSelect(theme.id)
                      }}
                      style={{
                        backgroundColor: theme.primary,
                        color: theme.background,
                      }}
                    >
                      Apply Theme
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Create Custom Theme Button */}
            <div className="mt-4 pt-3 border-t border-gray-600">
              <Button
                onClick={() => {
                  setShowThemes(false)
                  setShowThemeCreator(true)
                }}
                variant="outline"
                className="w-full bg-gradient-to-b from-gray-700 to-gray-800 border-gray-600 text-gray-200 hover:from-gray-600 hover:to-gray-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Theme
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                {user?.isGuest ? "Theme changes are temporary for guests" : "Theme preference will be saved"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Theme Creator Modal */}
      {showThemeCreator && (
        <ThemeCreator user={user} onClose={() => setShowThemeCreator(false)} onSave={handleSaveCustomTheme} />
      )}
    </div>
  )
}
