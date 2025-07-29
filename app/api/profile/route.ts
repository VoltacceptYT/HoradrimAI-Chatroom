import { type NextRequest, NextResponse } from "next/server"

// Import users array from login route
let users: any[] = []

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName, profilePicture, bio, theme } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Import users from login route
    const { users: importedUsers } = await import("../auth/login/route")
    users = importedUsers

    // Find user by email and password
    const userIndex = users.findIndex((u) => u.email === email && u.password === password)

    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user profile
    if (displayName) users[userIndex].displayName = displayName
    if (profilePicture) users[userIndex].customProfilePicture = profilePicture
    if (bio) users[userIndex].bio = bio
    if (theme) users[userIndex].theme = theme

    // Return updated user data (excluding password)
    const { password: _, ...userWithoutPassword } = users[userIndex]
    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        isGuest: false,
        isAdmin: email.endsWith("@voltaccept.com"),
      },
    })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const email = url.searchParams.get("email")
    const password = url.searchParams.get("password")

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Import users from login route
    const { users: importedUsers } = await import("../auth/login/route")
    users = importedUsers

    // Find user by email and password
    const user = users.find((u) => u.email === email && u.password === password)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
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
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
