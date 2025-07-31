import { type NextRequest, NextResponse } from "next/server"

// Import users from auth route with fallback
let users: any[] = []

// Try to get users from the auth route, with fallback data
try {
  // We'll maintain our own user list since imports can be unreliable
  users = [
    {
      id: "1",
      email: "admin@voltaccept.com",
      password: "admin123",
      username: "admin",
      displayName: "Admin",
      profilePicture: generateProfilePicture("admin@voltaccept.com"),
      customProfilePicture: null,
      bio: "System Administrator",
    },
    {
      id: "2",
      email: "user@voltaccept.com",
      password: "user123",
      username: "voltuser",
      displayName: "Volt User",
      profilePicture: generateProfilePicture("user@voltaccept.com"),
      customProfilePicture: null,
      bio: "Voltarian Community Member",
    },
    {
      id: "3",
      email: "test@gmail.com",
      password: "test123",
      username: "testuser",
      displayName: "Test User",
      profilePicture: generateProfilePicture("test@gmail.com"),
      customProfilePicture: null,
      bio: "Testing the platform",
    },
  ]
} catch (error) {
  console.log("Using fallback user data")
}

// Generate profile picture SVG (same as auth route)
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
      <text x="32" y="40" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">
        ${identifier.charAt(0).toUpperCase()}
      </text>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

// In-memory storage for dynamic users (users created during runtime)
const dynamicUsers: any[] = []

export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
  try {
    const { username } = params

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    console.log(`Looking for user: ${username}`)

    // First check static users
    let user = users.find((u) => u.username === username.toLowerCase())

    // If not found in static users, check dynamic users
    if (!user) {
      user = dynamicUsers.find((u) => u.username === username.toLowerCase())
    }

    // If still not found, try to get from localStorage data or create a basic profile
    if (!user) {
      console.log(`User ${username} not found in database, creating basic profile`)

      // Create a basic user profile for users that exist in messages but not in our database
      const basicUser = {
        id: `dynamic_${Date.now()}`,
        username: username.toLowerCase(),
        displayName: username,
        profilePicture: generateProfilePicture(username),
        customProfilePicture: null,
        bio: "Community member",
        email: null,
      }

      // Add to dynamic users so we don't recreate it
      dynamicUsers.push(basicUser)
      user = basicUser
    }

    // Get server memberships (this might be empty for dynamic users)
    let serverCount = 0
    let joinDate = Date.now() - 86400000 // Default to 1 day ago

    try {
      // Try to import server members to get accurate data
      const { serverMembers } = await import("../../servers/route")
      const userMemberships = serverMembers.filter((m) => m.username === username)
      serverCount = userMemberships.length

      if (userMemberships.length > 0) {
        joinDate = Math.min(...userMemberships.map((m) => m.joinedAt))
      }
    } catch (error) {
      console.log("Could not get server membership data")
    }

    // Return public user data (excluding sensitive info)
    const publicUserData = {
      username: user.username,
      displayName: user.displayName,
      profilePicture: user.customProfilePicture || user.profilePicture,
      bio: user.bio || "Community member",
      joinDate,
      serverCount,
      isAdmin: user.email?.endsWith("@voltaccept.com") || false,
      // Don't expose email or other sensitive data
    }

    console.log(`Returning profile for ${username}:`, publicUserData)

    return NextResponse.json({ user: publicUserData })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 })
  }
}

// Function to add a user to dynamic users (called when they send messages)
export function addDynamicUser(userData: any) {
  const existingUser = dynamicUsers.find((u) => u.username === userData.username)
  if (!existingUser) {
    dynamicUsers.push({
      id: `dynamic_${Date.now()}`,
      username: userData.username,
      displayName: userData.displayName,
      profilePicture: userData.profilePicture,
      customProfilePicture: userData.customProfilePicture || null,
      bio: userData.bio || "Community member",
      email: userData.email || null,
    })
    console.log(`Added dynamic user: ${userData.username}`)
  }
}
