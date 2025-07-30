"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Generate profile picture SVG (same function as in API)
function generateProfilePicture(identifier: string): string {
  let hash = 0
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  const colors = ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#6b7280", "#4b5563", "#374151"]
  const bgColor = colors[Math.abs(hash) % colors.length]
  const patternColor = colors[(Math.abs(hash) + 3) % colors.length]

  const patterns = [
    `<circle cx="32" cy="32" r="20" fill="${patternColor}" opacity="0.8"/>`,
    `<rect x="16" y="16" width="32" height="32" fill="${patternColor}" opacity="0.8"/>`,
    `<polygon points="32,12 52,32 32,52 12,32" fill="${patternColor}" opacity="0.8"/>`,
    `<polygon points="32,16 48,48 16,48" fill="${patternColor}" opacity="0.8"/>`,
  ]

  const pattern = patterns[Math.abs(hash) % patterns.length]

  const svg = `
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="${bgColor}"/>
      ${pattern}
      <text x="32" y="40" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold">
        ${identifier.charAt(0).toUpperCase()}
      </text>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, displayName }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store user data and password for profile updates
        localStorage.setItem("chatUser", JSON.stringify(data.user))
        localStorage.setItem("userPassword", password) // Store for profile updates
        router.push("/")
      } else {
        setError(data.error || "Login failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestLogin = () => {
    const guestId = `Guest${Math.floor(Math.random() * 10000)}`
    const guestUser = {
      username: guestId.toLowerCase(),
      displayName: guestId,
      email: null,
      profilePicture: generateProfilePicture(guestId),
      isGuest: true,
      isAdmin: false,
    }
    localStorage.setItem("chatUser", JSON.stringify(guestUser))
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-red-500 bg-gradient-to-br from-gray-700 to-gray-800 shadow-sm flex items-center justify-center">
            <span className="text-2xl font-bold text-red-400">VN</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Voltarian Networking</h1>
          <p className="text-gray-400">Connect with the community</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-gray-100">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="displayName" className="text-gray-100">
              Display Name
            </Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others will see you"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-100">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1"
              required
            />
          </div>

          {error && <div className="text-sm text-center text-red-400">{error}</div>}

          <Button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white">
            {isLoading ? "Connecting..." : "Join Network"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-b from-gray-800 to-gray-900 text-gray-400">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGuestLogin}
            className="w-full mt-4 bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700"
          >
            Continue as Guest
          </Button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400 space-y-1">
          <p>✨ Any email works for registration!</p>
          <p>Demo: test@gmail.com / test123</p>
        </div>
      </div>
    </div>
  )
}
