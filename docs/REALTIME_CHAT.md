# Realtime Chat (Socket.io)

T.E.S.T. coaching chat uses **Socket.io** for live message delivery, with **REST + 5s polling** as a fallback when the socket is unavailable.

## Architecture

| Layer | Role |
|-------|------|
| `server.ts` | Custom Node HTTP server wrapping Next.js 16 and attaching Socket.io |
| `src/lib/socket/server.ts` | Socket auth (JWT cookie), room join, send/receive, typing |
| `src/lib/chat/createMessage.ts` | Shared message persistence used by REST and socket handlers |
| `src/hooks/useChatSocket.ts` | Client hook — connect, join room, send/receive, typing |
| `src/app/(dashboard)/chat/[id]/page.tsx` | UI with optimistic sends; polls only when socket is disconnected |

## Socket events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_conversation` | client → server | `conversationId` |
| `leave_conversation` | client → server | `conversationId` |
| `send_message` | client → server | `{ conversationId, content, type?, attachedPlanId? }` |
| `new_message` | server → clients | shaped `Message` |
| `user_typing` | both | `{ conversationId, userId, isTyping }` |

Auth uses the existing `token` httpOnly cookie from the Socket.io handshake.

## Running locally

```bash
npm run dev    # starts custom server with Socket.io on :3000
npm run build
npm start      # production custom server (set NODE_ENV=production on hosts that require it)
```

> **Note:** `next dev` alone does **not** start the Socket.io server. Always use `npm run dev`.

## Tradeoffs vs serverless / Vercel

A persistent Socket.io server requires a **long-running Node process**. This fits self-hosted or VPS deployments (Railway, Render, Docker, etc.) but **does not work on pure serverless** platforms where API routes spin down between requests.

If you deploy to serverless only:

- REST chat continues to work.
- The client automatically falls back to 5s polling when the socket cannot connect.
- For true realtime on serverless, consider a managed pub/sub (Ably, Pusher) or SSE — out of scope for this implementation.

## Fallback behavior

1. Client attempts Socket.io connection on conversation open.
2. On success: live `new_message` events; polling is disabled.
3. On failure/disconnect: 5s REST polling resumes.
4. Sends try socket first; if disconnected or send fails, REST POST is used.
