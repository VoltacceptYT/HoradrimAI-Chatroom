import { type NextRequest, NextResponse } from "next/server"

interface Server {
  id: string
  name: string
  description: string
  ownerId: string
  ownerEmail: string
  createdAt: number
  memberCount: number
  inviteCode: string
  isPublic: boolean
}

interface ServerMember {
  serverId: string
  userId: string
  userEmail: string
  username: string
  displayName: string
  joinedAt: number
  role: "owner" | "admin" | "member"
}

// In-memory storage
const servers: Server[] = [
  {
    id: "general",
    name: "General Chat",
    description: "The main community chat room",
    ownerId: "system",
    ownerEmail: "system@voltaccept.com",
    createdAt: Date.now() - 86400000, // 1 day ago
    memberCount: 0,
    inviteCode: "general",
    isPublic: true,
  },
]

let serverMembers: ServerMember[] = []

// Generate random invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// GET - Get user's servers
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userEmail = url.searchParams.get("userEmail")
    const serverId = url.searchParams.get("serverId")

    if (serverId) {
      // Get specific server info
      const server = servers.find((s) => s.id === serverId)
      if (!server) {
        return NextResponse.json({ error: "Server not found" }, { status: 404 })
      }

      // Update member count
      const memberCount = serverMembers.filter((m) => m.serverId === serverId).length
      server.memberCount = memberCount

      return NextResponse.json({ server })
    }

    if (!userEmail) {
      return NextResponse.json({ error: "User email required" }, { status: 400 })
    }

    // Get user's servers
    const userMemberships = serverMembers.filter((m) => m.userEmail === userEmail)
    const userServers = servers
      .filter((s) => s.isPublic || userMemberships.some((m) => m.serverId === s.id))
      .map((server) => {
        const memberCount = serverMembers.filter((m) => m.serverId === server.id).length
        const userMembership = userMemberships.find((m) => m.serverId === server.id)

        return {
          ...server,
          memberCount,
          userRole: userMembership?.role || (server.isPublic ? "member" : null),
          joinedAt: userMembership?.joinedAt || null,
        }
      })

    return NextResponse.json({ servers: userServers })
  } catch (error) {
    console.error("Error fetching servers:", error)
    return NextResponse.json({ error: "Failed to fetch servers" }, { status: 500 })
  }
}

// POST - Create new server
export async function POST(request: NextRequest) {
  try {
    const { name, description, userEmail, username, displayName } = await request.json()

    if (!name || !userEmail || !username) {
      return NextResponse.json({ error: "Name, userEmail, and username are required" }, { status: 400 })
    }

    const serverId = `server_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const inviteCode = generateInviteCode()

    const newServer: Server = {
      id: serverId,
      name: name.trim(),
      description: description?.trim() || "",
      ownerId: username,
      ownerEmail: userEmail,
      createdAt: Date.now(),
      memberCount: 1,
      inviteCode,
      isPublic: false,
    }

    // Add server
    servers.push(newServer)

    // Add owner as member
    const ownerMembership: ServerMember = {
      serverId,
      userId: username,
      userEmail,
      username,
      displayName: displayName || username,
      joinedAt: Date.now(),
      role: "owner",
    }

    serverMembers.push(ownerMembership)

    console.log(`Server created: ${name} by ${username}`)

    return NextResponse.json({
      server: {
        ...newServer,
        userRole: "owner",
        joinedAt: ownerMembership.joinedAt,
      },
    })
  } catch (error) {
    console.error("Error creating server:", error)
    return NextResponse.json({ error: "Failed to create server" }, { status: 500 })
  }
}

// PUT - Join server via invite code
export async function PUT(request: NextRequest) {
  try {
    const { inviteCode, userEmail, username, displayName } = await request.json()

    if (!inviteCode || !userEmail || !username) {
      return NextResponse.json({ error: "Invite code, userEmail, and username are required" }, { status: 400 })
    }

    // Find server by invite code
    const server = servers.find((s) => s.inviteCode === inviteCode)
    if (!server) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })
    }

    // Check if user is already a member
    const existingMembership = serverMembers.find((m) => m.serverId === server.id && m.userEmail === userEmail)

    if (existingMembership) {
      return NextResponse.json({ error: "You are already a member of this server" }, { status: 400 })
    }

    // Add user as member
    const newMembership: ServerMember = {
      serverId: server.id,
      userId: username,
      userEmail,
      username,
      displayName: displayName || username,
      joinedAt: Date.now(),
      role: "member",
    }

    serverMembers.push(newMembership)

    // Update member count
    server.memberCount = serverMembers.filter((m) => m.serverId === server.id).length

    console.log(`User ${username} joined server: ${server.name}`)

    return NextResponse.json({
      server: {
        ...server,
        userRole: "member",
        joinedAt: newMembership.joinedAt,
      },
    })
  } catch (error) {
    console.error("Error joining server:", error)
    return NextResponse.json({ error: "Failed to join server" }, { status: 500 })
  }
}

// DELETE - Leave server
export async function DELETE(request: NextRequest) {
  try {
    const { serverId, userEmail } = await request.json()

    if (!serverId || !userEmail) {
      return NextResponse.json({ error: "Server ID and user email are required" }, { status: 400 })
    }

    // Find server
    const server = servers.find((s) => s.id === serverId)
    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }

    // Can't leave general server
    if (serverId === "general") {
      return NextResponse.json({ error: "Cannot leave the general server" }, { status: 400 })
    }

    // Find membership
    const membershipIndex = serverMembers.findIndex((m) => m.serverId === serverId && m.userEmail === userEmail)

    if (membershipIndex === -1) {
      return NextResponse.json({ error: "You are not a member of this server" }, { status: 400 })
    }

    const membership = serverMembers[membershipIndex]

    // If owner is leaving, delete the server
    if (membership.role === "owner") {
      // Remove all members
      serverMembers = serverMembers.filter((m) => m.serverId !== serverId)
      // Remove server
      const serverIndex = servers.findIndex((s) => s.id === serverId)
      if (serverIndex !== -1) {
        servers.splice(serverIndex, 1)
      }
      console.log(`Server ${server.name} deleted by owner ${membership.username}`)
    } else {
      // Just remove the member
      serverMembers.splice(membershipIndex, 1)
      console.log(`User ${membership.username} left server: ${server.name}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error leaving server:", error)
    return NextResponse.json({ error: "Failed to leave server" }, { status: 500 })
  }
}

export { servers, serverMembers }
