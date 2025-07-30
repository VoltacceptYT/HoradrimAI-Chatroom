# VoltaNET - Voltarian Networking

A real-time chat application with Discord-like servers, invite links, and profile viewing.

## Features

- **Real-time messaging** with reliable polling system
- **Discord-like servers** with invite links and management
- **Profile viewing system** - Click on usernames to view profiles
- **Optimized profile pictures** with automatic compression
- **PWA support** with offline capabilities
- **Admin controls** for @voltaccept.com users
- **Guest and registered user support**

## Server System

### Server Features
- **Create servers** - Registered users can create private servers
- **Join via invite codes** - Share 8-character invite codes
- **Server management** - Owners can manage their servers
- **Member tracking** - See member counts and join dates
- **Leave/delete servers** - Members can leave, owners can delete

### Invite Links
- **Automatic invite codes** - Generated for each server
- **URL sharing** - `yoursite.com?invite=ABC12345`
- **One-click joining** - Automatic server joining via URL
- **Copy to clipboard** - Easy invite sharing

## Profile System

### Profile Viewing
- **Click usernames** - View any user's public profile
- **Public information** - Display name, bio, join date, server count
- **Admin badges** - Special indicators for admin users
- **Profile pictures** - Compressed and optimized images

### Profile Data
- Username and display name
- Custom bio and profile picture
- Join date and server membership count
- Admin status indicators
- Privacy-focused (no sensitive data exposed)

## Technical Architecture

### Server Storage
\`\`\`javascript
// Server structure
{
  id: "server_123",
  name: "My Server",
  description: "Server description",
  ownerId: "username",
  memberCount: 5,
  inviteCode: "ABC12345",
  isPublic: false
}

// Member structure
{
  serverId: "server_123",
  userId: "username",
  userEmail: "user@example.com",
  role: "owner" | "admin" | "member",
  joinedAt: timestamp
}
\`\`\`

### Message Storage
- **Server-specific messages** - Messages organized by server ID
- **Memory management** - 100 message limit per server
- **Real-time polling** - 1.5 second intervals for new messages
- **Efficient querying** - Only fetch new messages since last timestamp

### API Endpoints
- `GET /api/servers` - Get user's servers
- `POST /api/servers` - Create new server
- `PUT /api/servers` - Join server via invite
- `DELETE /api/servers` - Leave/delete server
- `GET /api/users/[username]` - Get public user profile
- `GET /api/messages?serverId=X` - Get server messages

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`

## Environment Variables

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: For push notifications
- `VAPID_PRIVATE_KEY`: For push notifications

## Usage

### Creating a Server
1. Click "Create Server" in the sidebar
2. Enter server name and description
3. Get automatic invite code for sharing

### Joining a Server
1. Get invite code from server member
2. Click "Join Server" or use invite URL
3. Enter invite code to join

### Viewing Profiles
1. Click on any username in chat
2. View public profile information
3. See join date, server count, and bio

### Server Management
- **Owners** can delete servers and manage settings
- **Members** can leave servers (except General)
- **Admins** can clear chat history in any server

## Performance Optimizations

- Server-specific message storage
- Efficient polling with timestamp filtering
- Image compression for profile pictures
- Memory management with message limits
- Lazy loading and error handling
- Optimized API queries

The app now supports Discord-like functionality with multiple servers, invite links, and comprehensive profile viewing! 🚀
