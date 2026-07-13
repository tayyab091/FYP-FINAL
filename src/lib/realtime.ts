import Pusher from 'pusher'

let pusherServer: Pusher | null = null

export function isPusherConfigured(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_KEY &&
      process.env.PUSHER_SECRET &&
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  )
}

export function getPusherServer(): Pusher | null {
  if (!isPusherConfigured()) return null
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    })
  }
  return pusherServer
}

export function conversationChannel(conversationId: string) {
  return `private-conversation-${conversationId}`
}

export function userChannel(userId: string) {
  return `private-user-${userId}`
}

export async function publishChatMessage(conversationId: string, message: unknown) {
  const pusher = getPusherServer()
  if (!pusher) return
  await pusher.trigger(conversationChannel(conversationId), 'new_message', message)
}

export async function publishTyping(
  conversationId: string,
  payload: { userId: string; isTyping: boolean },
) {
  const pusher = getPusherServer()
  if (!pusher) return
  await pusher.trigger(conversationChannel(conversationId), 'user_typing', payload)
}

export async function publishNotification(userId: string, notification: unknown) {
  const pusher = getPusherServer()
  if (!pusher) return
  await pusher.trigger(userChannel(userId), 'notification', notification)
}
