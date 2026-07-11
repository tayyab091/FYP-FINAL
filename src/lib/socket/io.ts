import type { Server } from 'socket.io'

const globalForSocket = globalThis as typeof globalThis & {
  __socketIO?: Server
}

export function setIO(io: Server) {
  globalForSocket.__socketIO = io
}

export function getIO(): Server | null {
  return globalForSocket.__socketIO ?? null
}

export function conversationRoom(conversationId: string) {
  return `conversation:${conversationId}`
}

export function emitNewMessage(conversationId: string, message: unknown) {
  const io = getIO()
  if (!io) return
  io.to(conversationRoom(conversationId)).emit('new_message', message)
}
