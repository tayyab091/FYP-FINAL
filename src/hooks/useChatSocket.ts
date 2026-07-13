'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Pusher, { type Channel } from 'pusher-js'
import type { Message } from '@/types'

interface UseChatRealtimeOptions {
  conversationId: string | undefined
  enabled: boolean
  onMessage: (message: Message) => void
  onTyping?: (payload: { userId: string; isTyping: boolean }) => void
  onConnectionChange?: (connected: boolean) => void
}

function isPusherClientConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  )
}

/** Subscribe to conversation events via Pusher (Vercel-compatible). Sends go through REST. */
export function useChatRealtime({
  conversationId,
  enabled,
  onMessage,
  onTyping,
  onConnectionChange,
}: UseChatRealtimeOptions) {
  const [connected, setConnected] = useState(false)
  const channelRef = useRef<Channel | null>(null)
  const pusherRef = useRef<Pusher | null>(null)
  const onMessageRef = useRef(onMessage)
  const onTypingRef = useRef(onTyping)
  const onConnectionChangeRef = useRef(onConnectionChange)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])
  useEffect(() => {
    onTypingRef.current = onTyping
  }, [onTyping])
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange
  }, [onConnectionChange])

  useEffect(() => {
    if (!enabled || !conversationId || !isPusherClientConfigured()) {
      setConnected(false)
      onConnectionChangeRef.current?.(false)
      return
    }

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    })
    pusherRef.current = pusher

    const setConn = (value: boolean) => {
      setConnected(value)
      onConnectionChangeRef.current?.(value)
    }

    pusher.connection.bind('connected', () => setConn(true))
    pusher.connection.bind('disconnected', () => setConn(false))
    pusher.connection.bind('unavailable', () => setConn(false))
    pusher.connection.bind('failed', () => setConn(false))

    const channelName = `private-conversation-${conversationId}`
    const channel = pusher.subscribe(channelName)
    channelRef.current = channel

    channel.bind('pusher:subscription_succeeded', () => setConn(true))
    channel.bind('pusher:subscription_error', () => setConn(false))
    channel.bind('new_message', (message: Message) => onMessageRef.current(message))
    channel.bind('user_typing', (payload: { userId: string; isTyping: boolean }) => {
      onTypingRef.current?.(payload)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      pusher.disconnect()
      channelRef.current = null
      pusherRef.current = null
      setConn(false)
    }
  }, [enabled, conversationId])

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return
      void fetch(`/api/chat/conversations/${conversationId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping }),
      }).catch(() => {})
    },
    [conversationId],
  )

  return { connected, sendTyping }
}

/** @deprecated Use useChatRealtime — Socket.io is not supported on Vercel. */
export const useChatSocket = useChatRealtime
