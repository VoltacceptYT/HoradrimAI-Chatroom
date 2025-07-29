-- Redis Database Setup for Voltarian Networking
-- Using Upstash Redis at: https://informed-seasnail-57123.upstash.io

-- Redis Key Structure:
-- voltarian:messages - List of chat messages (JSON strings)
-- 
-- Each message is stored as JSON with this structure:
-- {
--   "id": "msg_timestamp_randomstring",
--   "text": "message content",
--   "username": "user display name", 
--   "displayName": "user display name",
--   "profilePicture": "url to profile image",
--   "timestamp": 1234567890
-- }

-- Redis Commands that will be used:
-- LPUSH voltarian:messages '{"id":"msg_123","text":"Hello","username":"user1",...}'
-- LRANGE voltarian:messages 0 -1  (get all messages)
-- LTRIM voltarian:messages 0 99   (keep only last 100 messages)
-- DEL voltarian:messages          (clear all messages - admin only)

-- The application automatically:
-- - Stores messages using LPUSH (newest first)
-- - Retrieves messages using LRANGE and reverses for display
-- - Keeps only the last 100 messages using LTRIM
-- - Handles real-time updates via polling every 1 second
-- - Manages user sessions in localStorage

-- Redis Connection Test:
-- PING (should return PONG)

-- Initial setup is complete - Redis will handle all data automatically
-- No manual setup required, the API routes will create the keys as needed
