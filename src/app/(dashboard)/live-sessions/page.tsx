'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface LiveSessionItem {
  _id: string
  title: string
  scheduledAt: string
  durationMinutes: number
  maxParticipants: number
  participantIds: string[]
  status: 'scheduled' | 'live' | 'ended'
  displayStatus?: string
  isPast?: boolean
  roomId: string
  trainerId: string
  clientId?: string | null
  trainer?: { fullName: string; profileImage?: string } | null
  client?: { fullName: string; profileImage?: string } | null
}

interface ActiveClient {
  _id: string
  userId: { _id: string; fullName: string; email?: string; profileImage?: string }
}

const DURATION_OPTIONS = [30, 45, 60] as const

function isElite(user: { role?: string; subscription?: { plan?: string } } | null) {
  if (!user) return false
  if (user.role === 'trainer' || user.role === 'admin' || user.role === 'super_admin') return true
  return user.subscription?.plan === 'elite'
}

function isCompleted(session: LiveSessionItem) {
  if (session.isPast || session.status === 'ended' || session.displayStatus === 'ended') return true
  const endAt =
    new Date(session.scheduledAt).getTime() + session.durationMinutes * 60_000
  return endAt < Date.now()
}

export default function LiveSessionsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState<LiveSessionItem[]>([])
  const [clients, setClients] = useState<ActiveClient[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    clientId: '',
    date: '',
    time: '',
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

  const loadClients = useCallback(async () => {
    const res = await fetch('/api/relationships?status=active')
    if (!res.ok) {
      setClients([])
      return
    }
    const data = await res.json()
    setClients(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const tasks: Promise<void>[] = [loadSessions()]
    if (user.role === 'trainer') tasks.push(loadClients())
    Promise.all(tasks).finally(() => setLoading(false))
  }, [user, loadSessions, loadClients])

  const { upcoming, past } = useMemo(() => {
    const up: LiveSessionItem[] = []
    const done: LiveSessionItem[] = []
    for (const session of sessions) {
      if (isCompleted(session)) done.push(session)
      else up.push(session)
    }
    done.sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    )
    return { upcoming: up, past: done }
  }, [sessions])

  const resetForm = () => {
    setForm({ title: '', clientId: '', date: '', time: '', durationMinutes: '60' })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.clientId || !form.date || !form.time) {
      toast.error('Title, client, date, and time are required')
      return
    }
    const scheduledAt = new Date(`${form.date}T${form.time}`)
    if (Number.isNaN(scheduledAt.getTime())) {
      toast.error('Invalid date or time')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          clientId: form.clientId,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: Number(form.durationMinutes) || 60,
          maxParticipants: 2,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || 'Failed to create session')
        return
      }
      toast.success('Live session scheduled')
      resetForm()
      setModalOpen(false)
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
        toast.error(data.message || 'Could not join session')
        return
      }
      if (!data.session?.meetingUrl) {
        toast.error('Meeting room is unavailable. Please try again.')
        return
      }
      router.push(`/live-sessions/${id}`)
    } catch {
      toast.error('Could not join session')
    } finally {
      setJoiningId(null)
    }
  }

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to view live sessions" />

  const eliteOk = isElite(user)
  const isTrainer = user.role === 'trainer'
  const userId = user.id || user._id

  const renderSessionCard = (session: LiveSessionItem, completed: boolean) => {
    const canJoin =
      !completed &&
      (isTrainer && session.trainerId === userId
        ? true
        : eliteOk &&
          (!session.clientId || session.clientId === userId || session.trainerId === userId))

    return (
      <li
        key={session._id}
        className={`elite-panel flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between ${
          completed ? 'opacity-55 grayscale-[0.35]' : ''
        }`}
      >
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3
              className={`font-heading text-lg font-bold ${completed ? 'text-muted-foreground' : 'text-white'}`}
            >
              {session.title}
            </h3>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${
                completed
                  ? 'bg-white/5 text-muted-foreground'
                  : session.status === 'live'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-white/10 text-muted-foreground'
              }`}
            >
              {completed ? 'Completed' : session.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {session.trainer?.fullName || 'Trainer'}
            {session.client?.fullName ? ` · with ${session.client.fullName}` : ''}
            {' · '}
            {session.durationMinutes} min
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
        {completed ? (
          <Button disabled variant="outline" className="shrink-0 text-muted-foreground">
            Completed
          </Button>
        ) : (
          <Button
            disabled={!canJoin || joiningId === session._id}
            onClick={() => void handleJoin(session._id)}
            className="shrink-0"
          >
            {joiningId === session._id
              ? 'Joining…'
              : canJoin
                ? 'Join Session'
                : 'Elite only'}
          </Button>
        )}
      </li>
    )
  }

  return (
    <div className="min-h-screen px-4 pb-28 pt-6 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="page-hero mb-6 px-6 py-8 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Elite Live</p>
              <h1 className="display-title text-3xl md:text-4xl">Live Training Sessions</h1>
              <p className="mt-2 text-muted-foreground">
                Join real-time trainer-led workouts over Jitsi. Elite members and session trainers
                can enter the room.
              </p>
            </div>
            {isTrainer && (
              <Button onClick={() => setModalOpen(true)} className="gap-1.5">
                <Plus className="size-4" />
                Schedule session
              </Button>
            )}
          </div>
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

        {loading ? (
          <PageLoader />
        ) : upcoming.length === 0 && past.length === 0 ? (
          <div className="elite-panel rounded-2xl py-16 text-center text-muted-foreground">
            No live sessions yet.
            {isTrainer && (
              <div className="mt-4">
                <Button onClick={() => setModalOpen(true)} variant="outline" className="gap-1.5">
                  <Plus className="size-4" />
                  Schedule your first session
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Upcoming
              </h2>
              {upcoming.length === 0 ? (
                <div className="elite-panel rounded-2xl py-10 text-center text-sm text-muted-foreground">
                  No upcoming sessions.
                </div>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((session) => renderSessionCard(session, false))}
                </ul>
              )}
            </section>

            {past.length > 0 && (
              <section>
                <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Completed
                </h2>
                <ul className="space-y-3">
                  {past.map((session) => renderSessionCard(session, true))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="bg-card/60 border-border text-white sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule a live session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <AuthField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="HIIT morning blast"
              required
            />

            <div>
              <Label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                Client
              </Label>
              <select
                value={form.clientId}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                required
                className="flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-primary/40"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client._id} value={client.userId._id}>
                    {client.userId.fullName}
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  No active clients yet. Accept a connection request first.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                  Date
                </Label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  className="flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-primary/40"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                  Time
                </Label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  required
                  className="flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-primary/40"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                Duration
              </Label>
              <select
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                className="flex h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-primary/40"
              >
                {DURATION_OPTIONS.map((mins) => (
                  <option key={mins} value={String(mins)}>
                    {mins} minutes
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || clients.length === 0}>
                {creating ? 'Creating…' : 'Create session'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
