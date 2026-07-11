'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Message } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export default function ChatConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  useEffect(() => {
    if (user && id) {
      loadMessages()
      pollRef.current = setInterval(loadMessages, 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [user, id, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
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

    setMessages(prev => [...prev, optimistic])
    setInput('')
    setSending(true)

    try {
      const res = await fetch(`/api/chat/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      const saved = await res.json()
      setMessages(prev => prev.map(m => m._id === optimistic._id ? saved : m))
    } catch {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id))
      setInput(content)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  if (authLoading) return <Loader />
  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center">
      <Link href="/login" className="btn-accent px-8 py-3">Sign in to chat</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col pt-16 pb-4 md:pb-4">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#111]/95 backdrop-blur-xl border-b border-[#1a1a1a] px-4 py-3 flex items-center gap-3">
        <Link href="/chat" className="text-[#a0a0a0] hover:text-white text-xl">←</Link>
        <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#00ff87] font-bold">
          💬
        </div>
        <div>
          <div className="font-semibold text-sm">Conversation</div>
          <div className="text-[#555] text-xs">Online</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 bg-[#1a1a1a] rounded-2xl w-2/3" />)}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-[#555] text-center py-12">No messages yet. Say hello! 👋</p>
        ) : (
          messages.map(msg => {
            const isMine = msg.senderId === user.id || msg.senderId === user._id
            const isOptimistic = msg._id.startsWith('temp-')
            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-[#00ff87] text-black rounded-br-md'
                    : 'bg-[#111] border border-[#1a1a1a] text-white rounded-bl-md'
                } ${isOptimistic ? 'opacity-70' : ''}`}>
                  {!isMine && (
                    <div className="text-[#00ff87] text-xs font-medium mb-1">{msg.senderName}</div>
                  )}
                  <p className="break-words">{msg.content}</p>
                  <div className={`text-[10px] mt-1 ${isMine ? 'text-black/50' : 'text-[#555]'}`}>
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

      {/* Input */}
      <form onSubmit={sendMessage}
        className="sticky bottom-0 bg-[#0a0a0a] border-t border-[#1a1a1a] px-4 py-3 max-w-2xl mx-auto w-full flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-[#111] border-[#2a2a2a] rounded-full px-4 h-10"
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !input.trim()}
          className="bg-[#00ff87] text-black hover:bg-[#00cc6a] rounded-full h-10 w-10 p-0 flex-shrink-0">
          ➤
        </Button>
      </form>
    </div>
  )
}

function Loader() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00ff87] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
