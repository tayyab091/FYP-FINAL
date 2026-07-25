'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Radio, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { SignInGate, AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'

interface LiveSessionDetail {
  _id: string
  title: string
  roomId: string
  meetingProvider?: string
  meetingUrl?: string
  status: string
  trainerId: string
  participantIds: string[]
  trainer?: { fullName: string } | null
}

function isElite(user: { role?: string; subscription?: { plan?: string } } | null) {
  if (!user) return false
  if (user.role === 'trainer' || user.role === 'admin' || user.role === 'super_admin') return true
  return user.subscription?.plan === 'elite'
}

export default function LiveSessionRoomPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const [session, setSession] = useState<LiveSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!user || !id) return

    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const joinRes = await fetch(`/api/live-sessions/${id}/join`, { method: 'POST' })
        const joinData = await joinRes.json()
        if (!joinRes.ok) {
          if (joinRes.status !== 403) {
            toast.error(joinData.message || 'Could not join')
          }
          const getRes = await fetch(`/api/live-sessions/${id}`)
          if (getRes.ok) {
            const getData = await getRes.json()
            if (!cancelled) setSession(getData.session)
          }
          setJoined(false)
          return
        }
        if (cancelled) return
        setJoined(true)
        setSession(joinData.session)

        const getRes = await fetch(`/api/live-sessions/${id}`)
        if (getRes.ok) {
          const getData = await getRes.json()
          if (!cancelled) setSession(getData.session)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, id])

  if (authLoading || loading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to join live sessions" />
  if (!isElite(user)) {
    return (
      <AccessGate
        icon={Radio}
        title="Elite live sessions"
        description="Live training video rooms are available on the Elite plan."
        action={
          <Link href="/subscription" className="btn-accent px-8 py-3 text-sm">
            Upgrade to Elite
          </Link>
        }
      />
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground">Session not found or you cannot join.</p>
        <Link href="/live-sessions" className="mt-4 inline-block text-primary hover:underline">
          Back to sessions
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Live session · Jitsi Meet</p>
          <h1 className="display-title text-2xl md:text-3xl">{session.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            with {session.trainer?.fullName || 'Coach'} · {session.status}
          </p>
        </div>
        <div className="flex gap-2">
          {session.meetingUrl && (
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/40"
            >
              <ExternalLink className="size-4" />
              Open in new tab
            </a>
          )}
          <Link href="/live-sessions" className="rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/40">
            Leave list
          </Link>
        </div>
      </div>

      {!session.meetingUrl ? (
        <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-muted-foreground">
          This session has no meeting URL yet. Ask the trainer to recreate it.
        </div>
      ) : (
        <iframe
          key={`${session._id}:${joined ? 'joined' : 'preview'}`}
          src={session.meetingUrl}
          title={session.title}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black"
        />
      )}
    </div>
  )
}
