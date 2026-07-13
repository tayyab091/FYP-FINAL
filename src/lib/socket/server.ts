import type { Server as HttpServer } from 'http'
import { Server, type Socket } from 'socket.io'
import { verifyToken, type TokenPayload } from '@/lib/auth'
import { parseCookies } from '@/lib/socket/parseCookies'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import {
  assertCanChat,
  createMessage,
  ChatError,
} from '@/lib/chat/createMessage'
import { conversationRoom, liveRoom, setIO, userRoom } from '@/lib/socket/io'

interface AuthedSocket extends Socket {
  user: TokenPayload
}

async function authenticateSocket(socket: Socket): Promise<TokenPayload | null> {
  const cookies = parseCookies(socket.handshake.headers.cookie)
  const token = cookies.token
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  await connectDB()
  const user = await User.findById(payload.userId)
    .select('email role isActive isSuspended')
    .lean()
  if (!user || user.isSuspended || user.isActive === false) return null

  return {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
  }
}

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || true,
      credentials: true,
    },
  })

  setIO(io)

  io.use(async (socket, next) => {
    try {
      const user = await authenticateSocket(socket)
      if (!user) return next(new Error('Unauthorized'))
      ;(socket as AuthedSocket).user = user
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const authedSocket = socket as AuthedSocket
    void socket.join(userRoom(authedSocket.user.userId))

    authedSocket.on(
      'join_conversation',
      async (
        conversationId: string,
        ack?: (res: { ok: boolean; error?: string }) => void,
      ) => {
        try {
          if (!conversationId) throw new ChatError(400, 'conversationId required')
          await assertCanChat(conversationId, authedSocket.user.userId)
          await socket.join(conversationRoom(conversationId))
          ack?.({ ok: true })
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof ChatError ? error.message : 'Failed to join',
          })
        }
      },
    )

    authedSocket.on('leave_conversation', (conversationId: string) => {
      if (conversationId) socket.leave(conversationRoom(conversationId))
    })

    authedSocket.on(
      'send_message',
      async (
        payload: {
          conversationId: string
          content: string
          type?: 'text' | 'workout_plan' | 'image'
          attachedPlanId?: string
        },
        ack?: (res: { ok: boolean; message?: unknown; error?: string }) => void,
      ) => {
        try {
          const saved = await createMessage({
            conversationId: payload.conversationId,
            sender: authedSocket.user,
            content: payload.content,
            type: payload.type,
            attachedPlanId: payload.attachedPlanId,
          })
          io.to(conversationRoom(payload.conversationId)).emit('new_message', saved)
          ack?.({ ok: true, message: saved })
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof ChatError ? error.message : 'Failed to send',
          })
        }
      },
    )

    authedSocket.on(
      'user_typing',
      (payload: { conversationId: string; isTyping: boolean }) => {
        if (!payload?.conversationId) return
        socket.to(conversationRoom(payload.conversationId)).emit('user_typing', {
          conversationId: payload.conversationId,
          userId: authedSocket.user.userId,
          isTyping: payload.isTyping,
        })
      },
    )

    authedSocket.on(
      'join_live_room',
      (
        payload: { roomId: string },
        ack?: (res: { ok: boolean; error?: string }) => void,
      ) => {
        try {
          if (!payload?.roomId) {
            ack?.({ ok: false, error: 'roomId required' })
            return
          }
          void socket.join(liveRoom(payload.roomId))
          socket.to(liveRoom(payload.roomId)).emit('peer_joined', {
            userId: authedSocket.user.userId,
          })
          ack?.({ ok: true })
        } catch {
          ack?.({ ok: false, error: 'Failed to join live room' })
        }
      },
    )

    authedSocket.on(
      'webrtc_signal',
      (payload: {
        roomId: string
        type: 'offer' | 'answer' | 'ice'
        sdp?: unknown
        candidate?: unknown
        targetUserId?: string
      }) => {
        if (!payload?.roomId || !payload?.type) return
        const signal = {
          type: payload.type,
          sdp: payload.sdp,
          candidate: payload.candidate,
          fromUserId: authedSocket.user.userId,
          roomId: payload.roomId,
        }
        if (payload.targetUserId) {
          socket.to(liveRoom(payload.roomId)).emit('webrtc_signal', {
            ...signal,
            targetUserId: payload.targetUserId,
          })
        } else {
          socket.to(liveRoom(payload.roomId)).emit('webrtc_signal', signal)
        }
      },
    )
  })

  return io
}
