'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Message } from '@/types'

interface UseChatSocketOptions {
  conversationId: string | undefined
  enabled: boolean
  onMessage: (message: Message) => void
  onTyping?: (payload: { userId: string; isTyping: boolean }) => void
  onConnectionChange?: (connected: boolean) => void
}

export function useChatSocket({
  conversationId,
  enabled,
  onMessage,
  onTyping,
  onConnectionChange,
}: UseChatSocketOptions) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
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
    if (!enabled || !conversationId) return

    const socket = io({
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    })
    socketRef.current = socket

    const setConn = (value: boolean) => {
      setConnected(value)
      onConnectionChangeRef.current?.(value)
    }

    socket.on('connect', () => {
      socket.emit('join_conversation', conversationId, (res: { ok?: boolean }) => {
        setConn(Boolean(res?.ok))
      })
    })

    socket.on('disconnect', () => setConn(false))
    socket.on('connect_error', () => setConn(false))
    socket.on('new_message', (message: Message) => onMessageRef.current(message))
    socket.on(
      'user_typing',
      (payload: { userId: string; isTyping: boolean }) => {
        onTypingRef.current?.(payload)
      },
    )

    return () => {
      socket.emit('leave_conversation', conversationId)
      socket.disconnect()
      socketRef.current = null
      setConn(false)
    }
  }, [enabled, conversationId])

  const sendMessage = useCallback(
    (
      content: string,
      type: Message['type'] = 'text',
      attachedPlanId?: string,
    ): Promise<{ ok: boolean; message?: Message; error?: string }> =>
      new Promise((resolve) => {
        const socket = socketRef.current
        if (!socket?.connected || !conversationId) {
          resolve({ ok: false, error: 'Not connected' })
          return
        }

        socket.emit(
          'send_message',
          { conversationId, content, type, attachedPlanId },
          (res: { ok: boolean; message?: Message; error?: string }) => {
            resolve(res ?? { ok: false, error: 'No response' })
          },
        )
      }),
    [conversationId],
  )

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current?.connected || !conversationId) return
      socketRef.current.emit('user_typing', { conversationId, isTyping })
    },
    [conversationId],
  )

  return { connected, sendMessage, sendTyping }
}
