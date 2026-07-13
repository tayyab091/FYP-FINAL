import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { assertCanChat, ChatError } from '@/lib/chat/createMessage'
import {
  conversationChannel,
  getPusherServer,
  isPusherConfigured,
  userChannel,
} from '@/lib/realtime'

/** Authorize private Pusher channels for chat conversations and user notifications. */
export async function POST(req: NextRequest) {
  try {
    if (!isPusherConfigured()) {
      return NextResponse.json({ message: 'Realtime is not configured' }, { status: 503 })
    }

    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.formData()
    const socketId = String(body.get('socket_id') || '')
    const channelName = String(body.get('channel_name') || '')

    if (!socketId || !channelName) {
      return NextResponse.json({ message: 'socket_id and channel_name required' }, { status: 400 })
    }

    const pusher = getPusherServer()
    if (!pusher) {
      return NextResponse.json({ message: 'Realtime is not configured' }, { status: 503 })
    }

    if (channelName === userChannel(tokenUser.userId)) {
      const auth = pusher.authorizeChannel(socketId, channelName)
      return NextResponse.json(auth)
    }

    const conversationPrefix = 'private-conversation-'
    if (channelName.startsWith(conversationPrefix)) {
      const conversationId = channelName.slice(conversationPrefix.length)
      try {
        await assertCanChat(conversationId, tokenUser.userId)
      } catch (error) {
        if (error instanceof ChatError) {
          return NextResponse.json({ message: error.message }, { status: error.status })
        }
        throw error
      }
      if (channelName !== conversationChannel(conversationId)) {
        return NextResponse.json({ message: 'Invalid channel' }, { status: 403 })
      }
      const auth = pusher.authorizeChannel(socketId, channelName)
      return NextResponse.json(auth)
    }

    return NextResponse.json({ message: 'Forbidden channel' }, { status: 403 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
