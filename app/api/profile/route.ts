import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for users (shared with login route)
// We'll maintain our own copy here to avoid import issues
let users: any[] = [
  {
    id: "1",
    email: "admin@voltaccept.com",
    password: "admin123",
    username: "admin",
    displayName: "Admin",
    profilePicture: null,
    customProfilePicture: null,
    bio: "System Administrator",
    theme: "dark",
  },
  {
    id: "2",
    email: "user@voltaccept.com",
    password: "user123",
    username: "voltuser",
    displayName: "Volt User",
    profilePicture: null,
    customProfilePicture: null,
    bio: "Voltarian Community Member",
    theme: "dark",
  },
  {
    id: "3",
    email: "test@gmail.com",
    password: "test123",
    username: "testuser",
    displayName: "Test User",
    profilePicture: null,
    customProfilePicture: null,
    bio: "Testing the platform",
    theme: "dark",
  },
]

// Try to import users from login route, but don't fail if it doesn't work
try {
  import("../auth/login/route")
    .then((module) => {
      if (module.users && Array.isArray(module.users)) {
        users = module.users
        console.log("Successfully imported users from login route")
      }
    })
    .catch((err) => {
      console.log("Could not import users from login route, using default users")
    })
} catch (error) {
  console.log("Error importing users:", error)
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName, profilePicture, bio, theme } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    console.log(`Updating profile for ${email}`)

    // Find user by email and password
    const userIndex = users.findIndex((u) => u.email === email && u.password === password)

    if (userIndex === -1) {
      console.log("User not found:", email)

      // Create a new user if not found (for demo purposes)
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
        profilePicture: null,
        customProfilePicture: profilePicture || null,
        bio: bio || "New member",
        theme: theme || "dark",
      }

      users.push(newUser)
      console.log("Created new user:", newUser.username)

      // Return the new user
      const { password: _, ...userWithoutPassword } = newUser
      return NextResponse.json({
        user: {
          ...userWithoutPassword,
          isGuest: false,
          isAdmin: email.endsWith("@voltaccept.com"),
        },
      })
    }

    // Update user profile
    if (displayName) users[userIndex].displayName = displayName
    if (profilePicture) users[userIndex].customProfilePicture = profilePicture
    if (bio) users[userIndex].bio = bio
    if (theme) users[userIndex].theme = theme

    console.log("Updated user:", users[userIndex].username)

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
