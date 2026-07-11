'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

interface PendingRequest {
  _id: string
  userId: { _id: string; fullName: string; email: string; profileImage?: string; country?: string }
  status: string
  createdAt: string
}

interface Client {
  _id: string
  userId: { _id: string; fullName: string; email: string; profileImage?: string }
  status: string
  conversationId?: string
}

interface Conversation {
  _id: string
  otherUser: { _id: string; fullName: string; profileImage?: string }
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
}

interface DraftExercise {
  name: string
  sets: number
  reps: string
  restSeconds: number
}

interface DraftDay {
  day: string
  isRestDay: boolean
  exercises: DraftExercise[]
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const createEmptySchedule = (): DraftDay[] =>
  DAYS.map((day) => ({
    day,
    isRestDay: false,
    exercises: [{ name: '', sets: 3, reps: '10', restSeconds: 60 }],
  }))

export default function TrainerDashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activePlanCount, setActivePlanCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [planForm, setPlanForm] = useState({ title: '', goal: 'general_fitness', durationWeeks: '8', difficulty: 'beginner' })
  const [planSchedule, setPlanSchedule] = useState<DraftDay[]>(createEmptySchedule)
  const [creating, setCreating] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/relationships/pending-requests').then(r => r.ok ? r.json() : []),
      fetch('/api/relationships?status=active').then(r => r.ok ? r.json() : []),
      fetch('/api/chat/conversations').then(r => r.ok ? r.json() : []),
      fetch('/api/tracking/plans').then(r => r.ok ? r.json() : []),
    ]).then(([reqs, cls, convs, plans]) => {
      setRequests(Array.isArray(reqs) ? reqs : [])
      setClients(Array.isArray(cls) ? cls : [])
      setConversations(Array.isArray(convs) ? convs : [])
      setActivePlanCount(Array.isArray(plans) ? plans.filter((plan: { status?: string }) => plan.status === 'active').length : 0)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user?.role === 'trainer') loadData()
  }, [user])

  const handleAccept = async (id: string) => {
    try {
      const res = await fetch(`/api/relationships/${id}/accept`, { method: 'PUT' })
      if (!res.ok) throw new Error()
      toast.success('Client accepted!')
      loadData()
    } catch {
      toast.error('Failed to accept request')
    }
  }

  const handleDecline = async (id: string) => {
    try {
      const res = await fetch(`/api/relationships/${id}/reject`, { method: 'PUT' })
      if (!res.ok) throw new Error()
      toast.success('Request declined')
      loadData()
    } catch {
      toast.error('Failed to decline request')
    }
  }

  const updateDay = (dayIndex: number, update: Partial<DraftDay>) => {
    setPlanSchedule((schedule) =>
      schedule.map((day, index) => index === dayIndex ? { ...day, ...update } : day),
    )
  }

  const updateExercise = (
    dayIndex: number,
    exerciseIndex: number,
    update: Partial<DraftExercise>,
  ) => {
    setPlanSchedule((schedule) =>
      schedule.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((exercise, currentIndex) =>
                currentIndex === exerciseIndex ? { ...exercise, ...update } : exercise,
              ),
            }
          : day,
      ),
    )
  }

  const addExercise = (dayIndex: number) => {
    setPlanSchedule((schedule) =>
      schedule.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                { name: '', sets: 3, reps: '10', restSeconds: 60 },
              ],
            }
          : day,
      ),
    )
  }

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    setPlanSchedule((schedule) =>
      schedule.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: day.exercises.filter((_, currentIndex) => currentIndex !== exerciseIndex),
            }
          : day,
      ),
    )
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !planForm.title) return toast.error('Title is required')
    setCreating(true)
    try {
      const res = await fetch('/api/tracking/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedClient.userId._id,
          relationshipId: selectedClient._id,
          title: planForm.title,
          goal: planForm.goal,
          durationWeeks: parseInt(planForm.durationWeeks),
          difficulty: planForm.difficulty,
          weeklySchedule: planSchedule.map((day) => ({
            ...day,
            exercises: day.isRestDay
              ? []
              : day.exercises.filter((exercise) => exercise.name.trim()),
          })),
        }),
      })
      const plan = await res.json()
      if (!res.ok) throw new Error(plan.message)
      const activateRes = await fetch(`/api/tracking/plans/${plan._id}/activate`, { method: 'PUT' })
      if (!activateRes.ok) throw new Error('Plan was created but could not be activated')
      toast.success('Workout plan created and activated!')
      setPlanModalOpen(false)
      setPlanForm({ title: '', goal: 'general_fitness', durationWeeks: '8', difficulty: 'beginner' })
      setPlanSchedule(createEmptySchedule())
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create plan')
    } finally {
      setCreating(false)
    }
  }

  if (authLoading) return <Loader />
  if (!user || user.role !== 'trainer') return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center">
      <p className="text-[#a0a0a0]">Trainer access only</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-8 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Trainer Dashboard</h1>
            <p className="text-[#a0a0a0]">Welcome, {user.fullName}</p>
          </div>
          <Link href="/" className="text-[#a0a0a0] hover:text-white text-sm">← Home</Link>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="bg-[#111] border border-[#1a1a1a] mb-8">
            {['overview', 'requests', 'clients', 'chat'].map(t => (
              <TabsTrigger key={t} value={t} className="capitalize data-active:bg-[#00ff87]/10 data-active:text-[#00ff87]">
                {t === 'requests' ? 'Client Requests' : t === 'clients' ? 'My Clients' : t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            {loading ? <Skeleton className="h-32 bg-[#1a1a1a]" /> : (
              <div className="space-y-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <StatCard label="Active Clients" value={clients.length} />
                  <StatCard label="Pending Requests" value={requests.length} />
                  <StatCard label="Active Plans" value={activePlanCount} />
                </div>
                <div>
                  <h2 className="mb-3 text-lg font-bold">Recent Messages</h2>
                  {conversations.length === 0 ? (
                    <p className="text-sm text-[#a0a0a0]">No conversations yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {conversations.slice(0, 3).map((conversation) => (
                        <Link
                          key={conversation._id}
                          href={`/chat/${conversation._id}`}
                          className="flex items-center justify-between rounded-xl border border-[#1a1a1a] bg-[#111] p-4 hover:border-[#00ff87]/30"
                        >
                          <div>
                            <div className="font-medium">{conversation.otherUser?.fullName}</div>
                            <div className="text-sm text-[#555]">{conversation.lastMessage || 'No messages yet'}</div>
                          </div>
                          {conversation.unreadCount > 0 && (
                            <Badge className="bg-[#00ff87] text-black">{conversation.unreadCount}</Badge>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            {loading ? <Skeleton className="h-48 bg-[#1a1a1a]" /> : requests.length === 0 ? (
              <p className="text-[#a0a0a0] text-center py-12">No pending requests</p>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <Card key={req._id} className="bg-[#111] border-[#1a1a1a] text-white">
                    <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#00ff87] font-bold">
                          {req.userId?.fullName?.[0] || '?'}
                        </div>
                        <div>
                          <div className="font-bold">{req.userId?.fullName}</div>
                          <div className="text-[#555] text-sm">{req.userId?.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleAccept(req._id)} className="bg-[#00ff87] text-black hover:bg-[#00cc6a]">
                          Accept
                        </Button>
                        <Button onClick={() => handleDecline(req._id)} variant="destructive">
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="clients">
            {loading ? <Skeleton className="h-48 bg-[#1a1a1a]" /> : clients.length === 0 ? (
              <p className="text-[#a0a0a0] text-center py-12">No active clients yet</p>
            ) : (
              <div className="space-y-4">
                {clients.map(client => (
                  <Card key={client._id} className="bg-[#111] border-[#1a1a1a] text-white">
                    <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <div className="font-bold">{client.userId?.fullName}</div>
                        <div className="text-[#555] text-sm">{client.userId?.email}</div>
                        <Badge className="mt-2 bg-[#00ff87]/10 text-[#00ff87]">{client.status}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => { setSelectedClient(client); setPlanModalOpen(true) }}
                          className="bg-[#00ff87] text-black hover:bg-[#00cc6a]">
                          Create Plan
                        </Button>
                        {client.conversationId && (
                          <Button variant="outline" onClick={() => router.push(`/chat/${client.conversationId}`)}>
                            Chat
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat">
            {loading ? <Skeleton className="h-48 bg-[#1a1a1a]" /> : conversations.length === 0 ? (
              <p className="text-[#a0a0a0] text-center py-12">No conversations yet</p>
            ) : (
              <div className="space-y-2">
                {conversations.map(c => (
                  <Link key={c._id} href={`/chat/${c._id}`}
                    className="flex items-center gap-4 p-4 bg-[#111] border border-[#1a1a1a] rounded-xl hover:border-[#00ff87]/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#00ff87] font-bold">
                      {c.otherUser?.fullName?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{c.otherUser?.fullName}</div>
                      <div className="text-[#555] text-sm truncate">{c.lastMessage || 'No messages yet'}</div>
                    </div>
                    {c.unreadCount > 0 && (
                      <Badge className="bg-[#00ff87] text-black">{c.unreadCount}</Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="bg-[#111] border-[#2a2a2a] text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Workout Plan</DialogTitle>
            <p className="text-[#a0a0a0] text-sm">For {selectedClient?.userId?.fullName}</p>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div>
              <Label>Plan Title</Label>
              <Input value={planForm.title} onChange={e => setPlanForm(f => ({ ...f, title: e.target.value }))}
                className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" placeholder="8-Week Strength Builder" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (weeks)</Label>
                <Input type="number" value={planForm.durationWeeks}
                  onChange={e => setPlanForm(f => ({ ...f, durationWeeks: e.target.value }))}
                  className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
              </div>
              <div>
                <Label>Difficulty</Label>
                <select value={planForm.difficulty} onChange={e => setPlanForm(f => ({ ...f, difficulty: e.target.value }))}
                  className="mt-1 w-full h-8 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] px-2 text-sm">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Goal</Label>
              <select value={planForm.goal} onChange={e => setPlanForm(f => ({ ...f, goal: e.target.value }))}
                className="mt-1 w-full h-8 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] px-2 text-sm">
                <option value="general_fitness">General Fitness</option>
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="endurance">Endurance</option>
                <option value="flexibility">Flexibility</option>
              </select>
            </div>
            <div className="space-y-3">
              <Label>Weekly Schedule</Label>
              {planSchedule.map((day, dayIndex) => (
                <div key={day.day} className="rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-medium">{day.day}</span>
                    <label className="flex items-center gap-2 text-xs text-[#a0a0a0]">
                      <input
                        type="checkbox"
                        checked={day.isRestDay}
                        onChange={(event) => updateDay(dayIndex, { isRestDay: event.target.checked })}
                        className="accent-[#00ff87]"
                      />
                      Rest day
                    </label>
                  </div>
                  {!day.isRestDay && (
                    <div className="space-y-2">
                      {day.exercises.map((exercise, exerciseIndex) => (
                        <div key={exerciseIndex} className="grid gap-2 sm:grid-cols-[1fr_70px_90px_90px_auto]">
                          <Input
                            aria-label={`${day.day} exercise name`}
                            placeholder="Exercise"
                            value={exercise.name}
                            onChange={(event) => updateExercise(dayIndex, exerciseIndex, { name: event.target.value })}
                            className="bg-[#111] border-[#2a2a2a]"
                          />
                          <Input
                            aria-label="Sets"
                            type="number"
                            min="1"
                            value={exercise.sets}
                            onChange={(event) => updateExercise(dayIndex, exerciseIndex, { sets: Number(event.target.value) })}
                            className="bg-[#111] border-[#2a2a2a]"
                          />
                          <Input
                            aria-label="Repetitions"
                            placeholder="Reps"
                            value={exercise.reps}
                            onChange={(event) => updateExercise(dayIndex, exerciseIndex, { reps: event.target.value })}
                            className="bg-[#111] border-[#2a2a2a]"
                          />
                          <Input
                            aria-label="Rest seconds"
                            type="number"
                            min="0"
                            value={exercise.restSeconds}
                            onChange={(event) => updateExercise(dayIndex, exerciseIndex, { restSeconds: Number(event.target.value) })}
                            className="bg-[#111] border-[#2a2a2a]"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeExercise(dayIndex, exerciseIndex)}
                            disabled={day.exercises.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={() => addExercise(dayIndex)}>
                        + Add Exercise
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlanModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating} className="bg-[#00ff87] text-black hover:bg-[#00cc6a]">
                {creating ? 'Creating...' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="bg-[#111] border-[#1a1a1a] text-white">
      <CardHeader><CardTitle className="text-sm text-[#a0a0a0]">{label}</CardTitle></CardHeader>
      <CardContent><div className="text-3xl font-black text-[#00ff87]">{value}</div></CardContent>
    </Card>
  )
}

function Loader() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00ff87] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
