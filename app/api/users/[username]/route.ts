import { type NextRequest, NextResponse } from "next/server"
import { users } from "../../auth/login/route"
import { serverMembers } from "../../servers/route"

export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
  try {
    const { username } = params

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Find user by username
    const user = users.find((u) => u.username === username.toLowerCase())

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get user's server memberships
    const userMemberships = serverMembers.filter((m) => m.username === username)
    const serverCount = userMemberships.length

    // Calculate join date (earliest server join or account creation)
    const joinDate =
      userMemberships.length > 0 ? Math.min(...userMemberships.map((m) => m.joinedAt)) : Date.now() - 86400000 // Default to 1 day ago if no memberships

    // Return public user data (excluding sensitive info)
    const publicUserData = {
      username: user.username,
      displayName: user.displayName,
      profilePicture: user.customProfilePicture || user.profilePicture,
      bio: user.bio || "No bio available",
      joinDate,
      serverCount,
      isAdmin: user.email?.endsWith("@voltaccept.com") || false,
      // Don't expose email or other sensitive data
    }

    return NextResponse.json({ user: publicUserData })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 })
  }
}
