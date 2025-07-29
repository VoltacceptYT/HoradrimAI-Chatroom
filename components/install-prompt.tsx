"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
  }

  if (!showInstallPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-red-500/50 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <span className="text-sm font-bold text-red-400">VN</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Install VoltaNET</h3>
              <p className="text-xs text-gray-400">Add to your home screen</p>
            </div>
          </div>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-gray-300 mb-4">
          Install Voltarian Networking for quick access and a native app experience.
        </p>

        <div className="flex gap-2">
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="flex-1 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="outline"
            className="bg-gradient-to-b from-gray-700 to-gray-800 border-gray-600 text-gray-200 hover:from-gray-600 hover:to-gray-700"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}
