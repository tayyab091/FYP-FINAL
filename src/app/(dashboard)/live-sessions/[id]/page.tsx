'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import DailyIframe, { type DailyCall } from '@daily-co/daily-js'
import { Radio, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { SignInGate, AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'

interface LiveSessionDetail {
  _id: string
  title: string
  roomId: string
  dailyRoomUrl?: string
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
  const [callError, setCallError] = useState('')
  const callFrameRef = useRef<DailyCall | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!joined || !session?.dailyRoomUrl || !containerRef.current) return

    let destroyed = false

    try {
      const existing = DailyIframe.getCallInstance()
      if (existing) {
        existing.destroy().catch(() => {})
      }

      const call = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '1rem',
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      })
      callFrameRef.current = call

      call.on('error', (event) => {
        setCallError(event?.errorMsg || 'Daily.co call error')
      })

      void call.join({ url: session.dailyRoomUrl }).catch((error: unknown) => {
        if (!destroyed) {
          setCallError(error instanceof Error ? error.message : 'Failed to join Daily room')
        }
      })
    } catch (error) {
      setCallError(error instanceof Error ? error.message : 'Failed to start Daily call')
    }

    return () => {
      destroyed = true
      const call = callFrameRef.current
      callFrameRef.current = null
      if (call) {
        void call.leave().finally(() => {
          void call.destroy()
        })
      }
    }
  }, [joined, session?.dailyRoomUrl])

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
          <p className="eyebrow mb-1">Live session · Daily.co</p>
          <h1 className="display-title text-2xl md:text-3xl">{session.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            with {session.trainer?.fullName || 'Coach'} · {session.status}
          </p>
        </div>
        <div className="flex gap-2">
          {session.dailyRoomUrl && (
            <a
              href={session.dailyRoomUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/40"
            >
              <ExternalLink className="size-4" />
              Open in Daily
            </a>
          )}
          <Link href="/live-sessions" className="rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/40">
            Leave list
          </Link>
        </div>
      </div>

      {callError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {callError}
        </div>
      )}

      {!session.dailyRoomUrl ? (
        <div className="rounded-2xl border border-border bg-card/40 p-8 text-center text-muted-foreground">
          This session has no Daily.co room URL. Ask the trainer to recreate it with DAILY_API_KEY configured.
        </div>
      ) : (
        <div
          ref={containerRef}
          className="aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black"
        />
      )}
    </div>
  )
}
