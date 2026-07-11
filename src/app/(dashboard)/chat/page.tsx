'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Conversation } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

export default function ChatListPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetch('/api/chat/conversations')
      .then(r => r.ok ? r.json() : [])
      .then(data => setConversations(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading) return <Loader />
  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center">
      <Link href="/login" className="btn-accent px-8 py-3">Sign in to chat</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-28 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-2">Messages</h1>
        <p className="text-[#a0a0a0] mb-8">Your conversations</p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-[#1a1a1a] rounded-xl" />)}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-[#a0a0a0] mb-4">No conversations yet</p>
            <Link href="/coaching" className="text-[#00ff87] hover:underline">Find a trainer to start chatting</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(c => (
              <Link key={c._id} href={`/chat/${c._id}`}
                className="flex items-center gap-4 p-4 bg-[#111] border border-[#1a1a1a] rounded-xl hover:border-[#00ff87]/30 transition-all">
                <div className="w-12 h-12 rounded-full bg-[#1a1a1a] overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {c.otherUser?.profileImage ? (
                    <img src={c.otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#00ff87] font-bold text-lg">{c.otherUser?.fullName?.[0] || '?'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.otherUser?.fullName || 'Unknown'}</span>
                    {c.lastMessageTime && (
                      <span className="text-[#555] text-xs">
                        {new Date(c.lastMessageTime).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-[#555] text-sm truncate mt-0.5">{c.lastMessage || 'No messages yet'}</p>
                </div>
                {c.unreadCount > 0 && (
                  <Badge className="bg-[#00ff87] text-black flex-shrink-0">{c.unreadCount}</Badge>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
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
