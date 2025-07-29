"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store user data
        localStorage.setItem("chatUser", JSON.stringify(data.user))
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
    const guestUser = {
      username: `Guest${Math.floor(Math.random() * 10000)}`,
      email: null,
      profilePicture: "/placeholder.svg?height=40&width=40",
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
          <img
            src="/placeholder.svg?height=64&width=64"
            alt="HoradrimAI"
            className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-red-500/50"
          />
          <h1 className="text-2xl font-bold text-gray-100 mb-2">HoradrimAI Chatroom</h1>
          <p className="text-gray-400">Sign in to join the conversation</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-gray-200">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="mt-1 bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500/20"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-200">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1 bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500/20"
              required
            />
          </div>

          {error && <div className="text-red-400 text-sm text-center">{error}</div>}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500 text-white"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-b from-gray-800 to-gray-900 text-gray-400">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGuestLogin}
            className="w-full mt-4 bg-gradient-to-b from-gray-700 to-gray-800 border-gray-600 text-gray-200 hover:from-gray-600 hover:to-gray-700"
          >
            Continue as Guest
          </Button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
          <p>✨ Any email works for login!</p>
          <p>🔑 @voltaccept.com emails get admin privileges</p>
          <p className="text-gray-600">Demo: test@gmail.com / test123</p>
        </div>
      </div>
    </div>
  )
}
