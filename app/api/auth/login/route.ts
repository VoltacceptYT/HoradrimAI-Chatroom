import { type NextRequest, NextResponse } from "next/server"

// Simple user database - now accepts any email
const users = [
  {
    id: "1",
    email: "admin@voltaccept.com",
    password: "admin123",
    username: "Admin",
    profilePicture: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "2",
    email: "user@voltaccept.com",
    password: "user123",
    username: "VoltUser",
    profilePicture: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "3",
    email: "test@gmail.com",
    password: "test123",
    username: "TestUser",
    profilePicture: "/placeholder.svg?height=40&width=40",
  },
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Check if user exists, if not create a new one
    let user = users.find((u) => u.email === email && u.password === password)

    if (!user) {
      // For demo purposes, create user on the fly
      // In production, you'd want proper registration
      const newUser = {
        id: `${users.length + 1}`,
        email,
        password,
        username: email.split("@")[0], // Use part before @ as username
        profilePicture: "/placeholder.svg?height=40&width=40",
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
        isAdmin: email.endsWith("@voltaccept.com"), // Only @voltaccept.com gets admin privileges
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
