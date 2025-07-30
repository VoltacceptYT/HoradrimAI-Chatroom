"use client"

// Image processing pipeline without GitHub upload
// Compress image for better performance
function compressImage(file: File, maxWidth = 200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio

      // Draw and compress
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, "image/jpeg", quality)
    }

    img.src = URL.createObjectURL(file)
  })
}

// Convert blob to base64 for storage
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Generate unique filename for reference
function generateImageId(username: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "")
  return `${cleanUsername}_${timestamp}_${random}`
}

// Process and store profile picture
export async function processProfilePicture(file: File, username: string): Promise<string> {
  try {
    console.log("Starting profile picture processing for:", username)

    // Compress the image first
    const compressedBlob = await compressImage(file, 200, 0.8)
    console.log(`Image compressed: ${file.size} -> ${compressedBlob.size} bytes`)

    // Convert to base64 for storage
    const base64Content = await blobToBase64(compressedBlob)

    // Generate unique ID for this image
    const imageId = generateImageId(username)
    console.log("Generated image ID:", imageId)

    // Create optimized data URL
    const optimizedDataUrl = `data:image/jpeg;base64,${base64Content}`

    // Store in localStorage with compression info
    const imageData = {
      id: imageId,
      dataUrl: optimizedDataUrl,
      originalSize: file.size,
      compressedSize: compressedBlob.size,
      username: username,
      timestamp: Date.now(),
    }

    // Store the processed image
    localStorage.setItem(`profile_${imageId}`, JSON.stringify(imageData))

    // Clean up old profile pictures for this user
    cleanupOldProfilePictures(username, imageId)

    console.log("Profile picture processed and stored successfully")
    return optimizedDataUrl
  } catch (error) {
    console.error("Image processing error:", error)
    throw new Error("Failed to process profile picture")
  }
}

// Clean up old profile pictures for a user
function cleanupOldProfilePictures(username: string, currentImageId: string): void {
  try {
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "")
    const keysToRemove: string[] = []

    // Find all profile pictures for this user
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("profile_") && key.includes(cleanUsername)) {
        const imageData = JSON.parse(localStorage.getItem(key) || "{}")
        if (imageData.id !== currentImageId) {
          keysToRemove.push(key)
        }
      }
    }

    // Remove old images
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key)
      console.log("Cleaned up old profile picture:", key)
    })

    console.log(`Cleaned up ${keysToRemove.length} old profile pictures`)
  } catch (error) {
    console.error("Failed to cleanup old profile pictures:", error)
  }
}

// Validate image file
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Please select an image file" }
  }

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: "Image size must be less than 5MB" }
  }

  // Check if it's a supported format
  const supportedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, error: "Supported formats: JPEG, PNG, GIF, WebP" }
  }

  return { valid: true }
}

// Get compression stats for display
export function getCompressionStats(originalSize: number, compressedSize: number): string {
  const reduction = ((originalSize - compressedSize) / originalSize) * 100
  return `${reduction.toFixed(1)}% smaller`
}

// Preload image to check if it's valid
export function preloadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = src
  })
}

// Get all stored profile pictures (for debugging)
export function getStoredProfilePictures(): any[] {
  const profiles: any[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith("profile_")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "{}")
        profiles.push(data)
      } catch (error) {
        console.error("Failed to parse profile data:", key)
      }
    }
  }

  return profiles.sort((a, b) => b.timestamp - a.timestamp)
}

// Clean up all profile pictures (admin function)
export function cleanupAllProfilePictures(): number {
  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith("profile_")) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key))
  console.log(`Cleaned up ${keysToRemove.length} profile pictures`)

  return keysToRemove.length
}
