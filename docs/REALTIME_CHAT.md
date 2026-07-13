# Realtime architecture (Vercel-compatible)

This app does **not** run a persistent Socket.io server (incompatible with Vercel serverless).

| Concern | Service |
|---------|---------|
| Chat + typing + notification push | **Pusher** private channels |
| Live training video | **Daily.co** rooms (scheduling/gating in our DB) |
| Chat image storage | **Vercel Blob** |

## Channels

- `private-conversation-{conversationId}` — `new_message`, `user_typing`
- `private-user-{userId}` — `notification`

Auth: `POST /api/pusher/auth` (JWT cookie + conversation membership check).

## Fallback

If Pusher env vars are missing, chat still works over REST with a 5s poll; the notification bell continues polling every 30s.
