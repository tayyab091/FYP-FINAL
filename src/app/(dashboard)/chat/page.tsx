'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Conversation } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { SignInGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { Avatar } from '@/components/shared/Avatar'

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

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to chat" />

  return (
    <div className="min-h-screen pt-6 pb-28 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="page-hero mb-6 px-6 py-8 sm:px-8">
          <p className="eyebrow mb-2">Coaching Conversations</p>
          <h1 className="display-title text-3xl md:text-4xl">Messages</h1>
          <p className="mt-2 text-muted-foreground">Stay aligned with your coach and keep momentum moving.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-muted rounded-xl" />)}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-muted-foreground mb-4">No conversations yet</p>
            <Link href="/coaching" className="text-primary hover:underline">Find a trainer to start chatting</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(c => (
              <Link key={c._id} href={`/chat/${c._id}`}
                className="elite-panel interactive-lift flex items-center gap-4 rounded-2xl p-4">
                <Avatar
                  name={c.otherUser?.fullName}
                  avatarUrl={c.otherUser?.avatarUrl || c.otherUser?.profileImage}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.otherUser?.fullName || 'Unknown'}</span>
                    {c.lastMessageTime && (
                      <span className="text-muted-foreground text-xs">
                        {new Date(c.lastMessageTime).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm truncate mt-0.5">{c.lastMessage || 'No messages yet'}</p>
                </div>
                {c.unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground flex-shrink-0">{c.unreadCount}</Badge>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

