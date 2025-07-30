import { type NextRequest, NextResponse } from "next/server"

// Generate profile picture SVG
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

// In-memory user database with profile customization
const users: any[] = [
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

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Check if user exists, if not create a new one
    let user = users.find((u) => u.email === email && u.password === password)

    if (!user) {
      // For demo purposes, create user on the fly
      const username = email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
      const newUser = {
        id: `${users.length + 1}`,
        email,
        password,
        username,
        displayName: displayName || email.split("@")[0],
        profilePicture: generateProfilePicture(email),
        customProfilePicture: null,
        bio: "New member",
      }
      users.push(newUser)
      user = newUser
    }

    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        isGuest: false,
        isAdmin: email.endsWith("@voltaccept.com"),
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Add export for users array so it can be imported by other routes:
export { users }
