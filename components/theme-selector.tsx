"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Palette, Check } from "lucide-react"

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

interface ThemeSelectorProps {
  user: User | null
  onThemeChange: (theme: string) => void
}

const themes = [
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

  useEffect(() => {
    if (user?.theme) {
      setCurrentTheme(user.theme)
      applyTheme(user.theme)
    }
  }, [user])

  const applyTheme = (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId)
    if (!theme) return

    const root = document.documentElement
    root.style.setProperty("--theme-primary", theme.colors.primary)
    root.style.setProperty("--theme-background", theme.colors.background)
    root.style.setProperty("--theme-surface", theme.colors.surface)
    root.style.setProperty("--theme-text", theme.colors.text)

    // Apply theme class to body
    document.body.className = document.body.className.replace(/theme-\w+/g, "")
    document.body.classList.add(`theme-${themeId}`)
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

  const currentThemeData = themes.find((t) => t.id === currentTheme)

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
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {themes.map((theme) => (
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
          </div>
          <div className="mt-4 pt-3 border-t border-gray-600">
            <p className="text-xs text-gray-400">
              {user?.isGuest ? "Theme changes are temporary for guests" : "Theme preference will be saved"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
