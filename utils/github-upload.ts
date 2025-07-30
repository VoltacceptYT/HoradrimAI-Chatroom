"use client"

// GitHub repository configuration
const GITHUB_CONFIG = {
  owner: "VoltacceptYT",
  repo: "VoltarianNetworking-PFPs",
  branch: "main",
  // You'll need to set this as an environment variable or use a GitHub token
  // For demo purposes, we'll use a public repo approach
}

// Compress image before upload
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

// Convert blob to base64 for GitHub API
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

// Generate unique filename
function generateFilename(username: string, extension = "jpg"): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "")
  return `${cleanUsername}_${timestamp}_${random}.${extension}`
}

// Upload image to GitHub repository
export async function uploadProfilePicture(file: File, username: string): Promise<string> {
  try {
    console.log("Starting profile picture upload for:", username)

    // Compress the image first
    const compressedBlob = await compressImage(file, 200, 0.8)
    console.log(`Image compressed: ${file.size} -> ${compressedBlob.size} bytes`)

    // Convert to base64 for GitHub API
    const base64Content = await blobToBase64(compressedBlob)

    // Generate unique filename
    const filename = generateFilename(username)
    console.log("Generated filename:", filename)

    // GitHub API endpoint
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/profiles/${filename}`

    // Prepare the commit data
    const commitData = {
      message: `Add profile picture for ${username}`,
      content: base64Content,
      branch: GITHUB_CONFIG.branch,
    }

    // Upload to GitHub (using public repo, no auth needed for public repos)
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        // Note: For private repos, you'd need: 'Authorization': `token ${GITHUB_TOKEN}`
      },
      body: JSON.stringify(commitData),
    })

    if (!response.ok) {
      // If GitHub upload fails, try alternative approach
      console.warn("GitHub upload failed, trying alternative method")
      return await uploadToAlternativeService(compressedBlob, username)
    }

    const result = await response.json()
    const imageUrl = result.content.download_url

    console.log("Successfully uploaded to GitHub:", imageUrl)
    return imageUrl
  } catch (error) {
    console.error("GitHub upload error:", error)
    // Fallback to alternative service
    return await uploadToAlternativeService(file, username)
  }
}

// Alternative upload service (using a free image hosting service)
async function uploadToAlternativeService(file: File | Blob, username: string): Promise<string> {
  try {
    console.log("Using alternative upload service for:", username)

    // Convert to base64 for fallback
    const base64 = await blobToBase64(file instanceof File ? file : file)

    // For now, we'll store in localStorage as a fallback
    // In production, you could use services like Imgur, Cloudinary, etc.
    const imageKey = `profile_${username}_${Date.now()}`
    const imageData = `data:image/jpeg;base64,${base64}`

    // Store in localStorage (temporary solution)
    localStorage.setItem(imageKey, imageData)

    console.log("Stored image in localStorage as fallback")
    return imageData
  } catch (error) {
    console.error("Alternative upload failed:", error)
    throw new Error("Failed to upload profile picture")
  }
}

// Delete old profile picture from GitHub
export async function deleteOldProfilePicture(imageUrl: string): Promise<void> {
  try {
    // Only delete if it's a GitHub URL from our repo
    if (!imageUrl.includes(`github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`)) {
      return
    }

    // Extract filename from URL
    const urlParts = imageUrl.split("/")
    const filename = urlParts[urlParts.length - 1]

    console.log("Attempting to delete old profile picture:", filename)

    // Get file info first to get the SHA
    const getUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/profiles/${filename}`
    const getResponse = await fetch(getUrl)

    if (!getResponse.ok) {
      console.log("Old file not found or already deleted")
      return
    }

    const fileInfo = await getResponse.json()

    // Delete the file
    const deleteUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/profiles/${filename}`
    const deleteResponse = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: `Delete old profile picture: ${filename}`,
        sha: fileInfo.sha,
        branch: GITHUB_CONFIG.branch,
      }),
    })

    if (deleteResponse.ok) {
      console.log("Successfully deleted old profile picture")
    }
  } catch (error) {
    console.error("Failed to delete old profile picture:", error)
    // Don't throw error, as this is not critical
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
