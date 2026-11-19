'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useActivityRefresh } from '@/hooks/useActivityRefresh'
import { Avatar } from '@/components/shared/Avatar'
import { SignInGate } from '@/components/shared/AccessGate'

interface Connection {
  _id: string
  canChat: boolean
  conversationId?: string
  trainerId: {
    _id: string
    name: string
    specialty?: string[] | string
    profileImage?: string
  } | null
}

export default function MyTrainersPage() {
  const { user, isLoading } = useAuth()
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useActivityRefresh(() => setRefresh(value => value + 1), user?.role === 'user', 15000)

  useEffect(() => {
    if (user?.role !== 'user') return
    const controller = new AbortController()
    fetch('/api/relationships?status=active', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load your connected trainers.')
        return response.json()
      })
      .then(data => {
        if (controller.signal.aborted) return
        setConnections(Array.isArray(data) ? data.filter(connection => connection.trainerId) : [])
        setError('')
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [user?.role, user?.id, refresh])

  if (!isLoading && !user) return <SignInGate redirectLabel="Sign in to see your trainers" />

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 pb-28">
      <div>
        <p className="section-eyebrow">Your coaching connections</p>
        <h1 className="display-title text-3xl">My trainers</h1>
        <p className="mt-2 text-muted-foreground">Ask your connected trainers to create or activate a workout plan for you.</p>
      </div>
      {loading || isLoading ? <p role="status">Loading your trainers…</p> : error ? (
        <div role="alert" className="rounded-2xl border border-border p-6">
          <p>{error}</p>
          <button type="button" onClick={() => setRefresh(value => value + 1)} className="mt-3 text-primary underline">Try again</button>
        </div>
      ) : connections.length ? connections.map(connection => (
        <article key={connection._id} className="elite-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={connection.trainerId!.name} avatarUrl={connection.trainerId!.profileImage} size="md" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">{connection.trainerId!.name}</h2>
              <p className="text-sm text-muted-foreground">{Array.isArray(connection.trainerId!.specialty) ? connection.trainerId!.specialty.join(', ') : connection.trainerId!.specialty}</p>
            </div>
          </div>
          {connection.canChat ? (
            <Link href={connection.conversationId ? `/chat/${connection.conversationId}` : '/chat'} className="btn-accent inline-flex items-center gap-2">
              <MessageCircle className="size-4" /> Ask about a plan
            </Link>
          ) : <p className="text-sm text-muted-foreground">Messaging is awaiting your trainer&apos;s permission.</p>}
        </article>
      )) : (
        <div className="rounded-2xl border border-border p-8 text-center">
          <p className="mb-4 text-muted-foreground">You don&apos;t have any active trainer connections yet.</p>
          <Link href="/coaching" className="btn-accent">Find a trainer to connect with</Link>
        </div>
      )}
    </div>
  )
}
