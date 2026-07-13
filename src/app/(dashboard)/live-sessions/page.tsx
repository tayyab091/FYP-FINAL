'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Calendar, Plus, Radio, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { SignInGate, AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import { AuthField } from '@/components/auth/AuthField'
import { Label } from '@/components/ui/label'

interface LiveSessionItem {
  _id: string
  title: string
  scheduledAt: string
  durationMinutes: number
  maxParticipants: number
  participantIds: string[]
  status: 'scheduled' | 'live' | 'ended'
  roomId: string
  trainerId: string
  trainer?: { fullName: string; profileImage?: string } | null
}

function isElite(user: { role?: string; subscription?: { plan?: string } } | null) {
  if (!user) return false
  if (user.role === 'trainer' || user.role === 'admin' || user.role === 'super_admin') return true
  return user.subscription?.plan === 'elite'
}

export default function LiveSessionsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState<LiveSessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    scheduledAt: '',
    durationMinutes: '60',
  })

  const loadSessions = useCallback(async () => {
    const res = await fetch('/api/live-sessions')
    if (!res.ok) {
      setSessions([])
      return
    }
    const data = await res.json()
    setSessions(Array.isArray(data.sessions) ? data.sessions : [])
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    loadSessions().finally(() => setLoading(false))
  }, [user, loadSessions])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.scheduledAt) {
      toast.error('Title and schedule time are required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          durationMinutes: Number(form.durationMinutes) || 60,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || 'Failed to create session')
        return
      }
      toast.success('Live session scheduled')
      setForm({ title: '', scheduledAt: '', durationMinutes: '60' })
      await loadSessions()
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (id: string) => {
    if (!isElite(user) && user?.role !== 'trainer') {
      toast.error('Elite membership required')
      return
    }
    setJoiningId(id)
    try {
      const res = await fetch(`/api/live-sessions/${id}/join`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || 'Could not join')
        return
      }
      router.push(`/live-sessions/${id}`)
    } finally {
      setJoiningId(null)
    }
  }

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to view live sessions" />

  const eliteOk = isElite(user)
  const isTrainer = user.role === 'trainer'

  return (
    <div className="min-h-screen px-4 pb-28 pt-6 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="page-hero mb-6 px-6 py-8 sm:px-8">
          <p className="eyebrow mb-2">Elite Live</p>
          <h1 className="display-title text-3xl md:text-4xl">Live Training Sessions</h1>
          <p className="mt-2 text-muted-foreground">
            Join real-time trainer-led workouts. Elite members and session trainers can enter the room.
          </p>
        </div>

        {!eliteOk && !isTrainer && (
          <div className="mb-6">
            <AccessGate
              icon={Radio}
              title="Elite feature"
              description="Live training sessions are available on the Elite plan. Upgrade to join upcoming rooms."
              action={
                <Link href="/subscription" className="btn-accent px-8 py-3 text-sm">
                  Upgrade to Elite
                </Link>
              }
              className="min-h-0"
            />
          </div>
        )}

        {isTrainer && (
          <form onSubmit={handleCreate} className="elite-panel mb-8 space-y-4 rounded-2xl p-6">
            <div className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Schedule a session</h2>
            </div>
            <AuthField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="HIIT morning blast"
              required
            />
            <div>
              <Label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                Date & time
              </Label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                required
                className="flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-primary/40"
              />
            </div>
            <AuthField
              label="Duration (minutes)"
              type="number"
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
              required
            />
            <Button type="submit" disabled={creating} className="w-full sm:w-auto">
              {creating ? 'Creating…' : 'Create session'}
            </Button>
          </form>
        )}

        {loading ? (
          <PageLoader />
        ) : sessions.length === 0 ? (
          <div className="elite-panel rounded-2xl py-16 text-center text-muted-foreground">
            No upcoming live sessions yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => {
              const canJoin =
                isTrainer && session.trainerId === (user.id || user._id)
                  ? true
                  : eliteOk
              return (
                <li
                  key={session._id}
                  className="elite-panel flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-lg font-bold text-white">{session.title}</h3>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${
                          session.status === 'live'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-white/10 text-muted-foreground'
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {session.trainer?.fullName || 'Trainer'} · {session.durationMinutes} min
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3.5" />
                      {new Date(session.scheduledAt).toLocaleString()}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      {session.participantIds.length}/{session.maxParticipants} joined
                    </p>
                  </div>
                  <Button
                    disabled={!canJoin || joiningId === session._id}
                    onClick={() => void handleJoin(session._id)}
                    className="shrink-0"
                  >
                    {joiningId === session._id ? 'Joining…' : canJoin ? 'Join' : 'Elite only'}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
