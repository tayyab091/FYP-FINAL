'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useChatSocket } from '@/hooks/useChatSocket'
import { Message } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageLoader } from '@/components/shared/PageLoader'
import { SignInGate } from '@/components/shared/AccessGate'
import { ArrowLeft, ImagePlus, MessageCircle, Send } from 'lucide-react'

interface ConversationInfo {
  otherUser: {
    _id: string
    fullName: string
    profileImage?: string
    role?: string
  }
  lastMessageTime?: string
}

const POLL_INTERVAL_MS = 5000
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

function mergeIncomingMessage(prev: Message[], incoming: Message) {
  if (prev.some((message) => message._id === incoming._id)) return prev

  const withoutMatchingOptimistic = prev.filter(
    (message) =>
      !(
        message._id.startsWith('temp-') &&
        message.content === incoming.content &&
        (message.senderId === incoming.senderId ||
          message.senderId === incoming.senderId?.toString?.())
      ),
  )

  return [...withoutMatchingOptimistic, incoming]
}

export default function ChatConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<ConversationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadMessages = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/chat/conversations/${id}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  const handleIncomingMessage = useCallback((message: Message) => {
    setMessages((prev) => mergeIncomingMessage(prev, message))
  }, [])

  const handleTyping = useCallback(
    ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (userId === user?.id || userId === user?._id) return
      setOtherUserTyping(isTyping)
    },
    [user],
  )

  const { connected, sendMessage: sendViaSocket, sendTyping } = useChatSocket({
    conversationId: id,
    enabled: Boolean(user && id),
    onMessage: handleIncomingMessage,
    onTyping: handleTyping,
    onConnectionChange: setSocketConnected,
  })

  useEffect(() => {
    if (user && id) {
      fetch(`/api/chat/conversations/${id}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => setConversation(data))
      loadMessages()
    }
  }, [user, id, loadMessages])

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    if (!user || !id) return

    if (!connected) {
      pollRef.current = setInterval(loadMessages, POLL_INTERVAL_MS)
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [user, id, connected, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  const sendMessageRest = async (
    content: string,
    type: Message['type'] = 'text',
  ) => {
    const res = await fetch(`/api/chat/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, type }),
    })
    if (!res.ok) throw new Error('Failed to send')
    return res.json() as Promise<Message>
  }

  const deliverMessage = async (
    content: string,
    type: Message['type'],
    optimistic: Message,
  ) => {
    setMessages((prev) => [...prev, optimistic])
    setSending(true)
    sendTyping(false)

    try {
      let saved: Message
      if (connected) {
        const result = await sendViaSocket(content, type)
        if (result.ok && result.message) {
          saved = result.message
        } else {
          saved = await sendMessageRest(content, type)
        }
      } else {
        saved = await sendMessageRest(content, type)
      }

      setMessages((prev) =>
        prev.map((message) => (message._id === optimistic._id ? saved : message)),
      )
    } catch {
      setMessages((prev) => prev.filter((message) => message._id !== optimistic._id))
      if (type === 'text') setInput(content)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault()
    const content = input.trim()
    if (!content || !id || !user) return

    const optimistic: Message = {
      _id: `temp-${Date.now()}`,
      conversationId: id,
      senderId: user.id,
      senderName: user.fullName,
      content,
      type: 'text',
      createdAt: new Date().toISOString(),
    }

    setInput('')
    await deliverMessage(content, 'text', optimistic)
  }

  const handleImagePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !id || !user) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 4MB or smaller')
      return
    }

    setSending(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const uploadRes = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.message || 'Upload failed')

      const url = uploadData.url as string
      const optimistic: Message = {
        _id: `temp-${Date.now()}`,
        conversationId: id,
        senderId: user.id,
        senderName: user.fullName,
        content: url,
        type: 'image',
        createdAt: new Date().toISOString(),
      }

      await deliverMessage(url, 'image', optimistic)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send image')
      setSending(false)
    }
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    if (!connected) return

    sendTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 1500)
  }

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const statusLabel = otherUserTyping
    ? 'Typing...'
    : socketConnected
      ? 'Live'
      : conversation?.lastMessageTime
        ? `Updated ${new Date(conversation.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Connecting...'

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to chat" />

  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] flex-col pb-4">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/[.06] bg-[#090c0a]/88 px-4 py-3 backdrop-blur-2xl">
        <Link href="/chat" aria-label="Back to conversations" className="flex size-9 items-center justify-center rounded-xl border border-white/[.08] text-[#8f9993] hover:text-white">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="relative size-10 overflow-hidden rounded-xl border border-primary/15 bg-primary/[.08] flex items-center justify-center">
          {conversation?.otherUser?.profileImage ? (
            <Image src={conversation.otherUser.profileImage} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            <span className="text-primary font-bold">
              {conversation?.otherUser?.fullName?.[0] || <MessageCircle className="size-4.5" />}
            </span>
          )}
        </div>
        <div>
          <div className="font-semibold text-sm">{conversation?.otherUser?.fullName || 'Conversation'}</div>
          <div className={`text-xs ${otherUserTyping ? 'text-primary' : 'text-muted-foreground'}`}>
            {statusLabel}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 bg-muted rounded-2xl w-2/3" />)}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No messages yet. Say hello! 👋</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user.id || msg.senderId === user._id
            const isOptimistic = msg._id.startsWith('temp-')
            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-gradient-to-br from-[#55ffb1] to-primary text-primary-foreground rounded-br-md shadow-[0_10px_28px_rgba(34,245,154,.12)]'
                    : 'bg-white/[.045] border border-white/[.075] text-white rounded-bl-md'
                } ${isOptimistic ? 'opacity-70' : ''}`}>
                  {!isMine && (
                    <div className="text-primary text-xs font-medium mb-1">{msg.senderName}</div>
                  )}
                  {msg.type === 'workout_plan' ? (
                    <div className={`rounded-xl border p-3 ${isMine ? 'border-black/20 bg-black/10' : 'border-primary/20 bg-primary/5'}`}>
                      <div className="mb-1 text-xs font-bold uppercase tracking-wide">🏋️ Workout Plan</div>
                      <p className="break-words font-medium">{msg.attachedPlan?.title || msg.content}</p>
                      {msg.attachedPlan && (
                        <p className="mt-1 text-xs opacity-70">
                          {msg.attachedPlan.durationWeeks} weeks · {msg.attachedPlan.difficulty}
                        </p>
                      )}
                    </div>
                  ) : msg.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.content}
                      alt="Shared image"
                      className="max-h-64 max-w-full rounded-lg object-contain"
                    />
                  ) : (
                    <p className="break-words">{msg.content}</p>
                  )}
                  <div className={`text-[10px] mt-1 ${isMine ? 'text-black/50' : 'text-muted-foreground'}`}>
                    {formatTime(msg.createdAt)}
                    {isOptimistic && ' · sending...'}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage}
        className="sticky bottom-0 mx-auto flex w-full max-w-2xl gap-2 border-t border-white/[.06] bg-[#090c0a]/90 px-4 py-3 backdrop-blur-2xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => void handleImagePick(event)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={sending}
          onClick={() => fileInputRef.current?.click()}
          className="h-11 w-11 flex-shrink-0 rounded-xl p-0"
          aria-label="Send image"
        >
          <ImagePlus className="size-4" />
        </Button>
        <Input
          value={input}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl"
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !input.trim()}
          className="h-11 w-11 flex-shrink-0 rounded-xl p-0">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
