'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Dumbbell, Users, ClipboardList, Utensils } from 'lucide-react'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { AvailabilityTab } from './AvailabilityTab'
import { StatCard } from '@/components/shared/StatCard'
import { StaggerChildren } from '@/components/motion'
import { Avatar } from '@/components/shared/Avatar'

interface PendingRequest {
  _id: string
  userId: { _id: string; fullName: string; email: string; profileImage?: string; avatarUrl?: string; country?: string }
  status: string
  createdAt: string
}

interface Client {
  _id: string
  userId: { _id: string; fullName: string; email: string; profileImage?: string; avatarUrl?: string }
  status: string
  conversationId?: string
}

interface Conversation {
  _id: string
  otherUser: { _id: string; fullName: string; profileImage?: string; avatarUrl?: string }
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

interface DraftMeal {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface TrainerMealPlan {
  _id: string
  title: string
  goal: string
  status: string
  dailyCalories: number
  durationDays?: number
  userId?: { _id: string; fullName?: string; email?: string } | string
  createdAt?: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES: DraftMeal['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack']
const createEmptySchedule = (): DraftDay[] =>
  DAYS.map((day) => ({
    day,
    isRestDay: false,
    exercises: [{ name: '', sets: 3, reps: '10', restSeconds: 60 }],
  }))
const createEmptyMeals = (): DraftMeal[] =>
  MEAL_TYPES.map((mealType) => ({
    mealType,
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  }))

export default function TrainerDashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activePlanCount, setActivePlanCount] = useState(0)
  const [mealPlans, setMealPlans] = useState<TrainerMealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [mealPlanModalOpen, setMealPlanModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [planForm, setPlanForm] = useState({ title: '', goal: 'general_fitness', durationWeeks: '8', difficulty: 'beginner' })
  const [planSchedule, setPlanSchedule] = useState<DraftDay[]>(createEmptySchedule)
  const [mealPlanForm, setMealPlanForm] = useState({
    title: '',
    goal: 'weight_loss',
    durationDays: '7',
    clientRelationshipId: '',
  })
  const [mealPlanMeals, setMealPlanMeals] = useState<DraftMeal[]>(createEmptyMeals)
  const [creating, setCreating] = useState(false)
  const [creatingMealPlan, setCreatingMealPlan] = useState(false)
  const [sendPlanViaChat, setSendPlanViaChat] = useState(true)
  const [clientProgress, setClientProgress] = useState<Record<string, unknown> | null>(null)
  const [progressClient, setProgressClient] = useState<Client | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/relationships/pending-requests').then(r => r.ok ? r.json() : []),
      fetch('/api/relationships?status=active').then(r => r.ok ? r.json() : []),
      fetch('/api/chat/conversations').then(r => r.ok ? r.json() : []),
      fetch('/api/tracking/plans').then(r => r.ok ? r.json() : []),
      fetch('/api/meal-plans').then(r => r.ok ? r.json() : []),
    ]).then(([reqs, cls, convs, plans, meals]) => {
      setRequests(Array.isArray(reqs) ? reqs : [])
      setClients(Array.isArray(cls) ? cls : [])
      setConversations(Array.isArray(convs) ? convs : [])
      setActivePlanCount(Array.isArray(plans) ? plans.filter((plan: { status?: string }) => plan.status === 'active').length : 0)
      setMealPlans(Array.isArray(meals) ? meals : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user?.role === 'trainer') loadData()
  }, [user])

  const handleAccept = async (id: string) => {
    try {
      const res = await fetch(`/api/relationships/${id}/accept`, { method: 'PUT' })
      if (!res.ok) throw new Error()
      toast.success('Client accepted! Chat created.')
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

      if (sendPlanViaChat && selectedClient.conversationId) {
        const msgRes = await fetch(`/api/chat/conversations/${selectedClient.conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'workout_plan',
            attachedPlanId: plan._id,
            content: `Your new workout plan "${planForm.title}" is ready!`,
          }),
        })
        if (!msgRes.ok) toast.error('Plan created but could not be sent via chat')
      }

      toast.success(sendPlanViaChat && selectedClient.conversationId
        ? 'Workout plan created, activated, and sent to client!'
        : 'Workout plan created and activated!')
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

  const updateMealPlanMeal = (index: number, update: Partial<DraftMeal>) => {
    setMealPlanMeals((meals) =>
      meals.map((meal, i) => (i === index ? { ...meal, ...update } : meal)),
    )
  }

  const handleCreateMealPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mealPlanForm.title.trim()) return toast.error('Plan name is required')
    if (!mealPlanForm.clientRelationshipId) return toast.error('Select a client')
    const filledMeals = mealPlanMeals.filter((m) => m.name.trim())
    if (filledMeals.length === 0) return toast.error('Add at least one meal with a food name')

    const client = clients.find((c) => c._id === mealPlanForm.clientRelationshipId)
    if (!client) return toast.error('Client not found')

    setCreatingMealPlan(true)
    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: client.userId._id,
          relationshipId: client._id,
          title: mealPlanForm.title.trim(),
          goal: mealPlanForm.goal,
          durationDays: parseInt(mealPlanForm.durationDays, 10) || 7,
          meals: filledMeals.map((m) => ({
            mealType: m.mealType,
            name: m.name.trim(),
            calories: Number(m.calories) || 0,
            protein: Number(m.protein) || 0,
            carbs: Number(m.carbs) || 0,
            fat: Number(m.fat) || 0,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create meal plan')
      toast.success('Meal plan created and assigned!')
      setMealPlanModalOpen(false)
      setMealPlanForm({ title: '', goal: 'weight_loss', durationDays: '7', clientRelationshipId: '' })
      setMealPlanMeals(createEmptyMeals())
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create meal plan')
    } finally {
      setCreatingMealPlan(false)
    }
  }

  const viewClientProgress = async (client: Client) => {
    setProgressClient(client)
    setLoadingProgress(true)
    setClientProgress(null)
    try {
      const res = await fetch(`/api/trainers/clients/${client.userId._id}/progress`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setClientProgress(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load client progress')
      setProgressClient(null)
    } finally {
      setLoadingProgress(false)
    }
  }

  if (authLoading) return <PageLoader />
  if (!user || user.role !== 'trainer') return (
    <AccessGate
      icon={Dumbbell}
      title="Trainer access only"
      description="This workspace is reserved for verified fitness coaches."
    />
  )

  return (
    <div className="dashboard-fab-reserve min-h-screen px-4 pt-6 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="page-hero mb-6 flex flex-wrap items-start justify-between gap-4 px-6 py-8 sm:px-8">
          <div>
            <p className="eyebrow mb-2">Coaching Workspace</p>
            <h1 className="display-title text-3xl md:text-4xl">Welcome, {user.fullName.split(' ')[0]}</h1>
            <p className="mt-2 text-muted-foreground">Manage clients, programs, and every coaching conversation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/trainer-dashboard/exercises" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-primary/40">
              Exercises
            </Link>
            <Link href="/trainer-dashboard/nutrition" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-primary/40">
              Nutrition
            </Link>
            <Link href="/chat" className="btn-accent px-4 py-2 text-sm font-bold">
              Open Messages
            </Link>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-8">
            {['overview', 'requests', 'clients', 'meal-plans', 'availability', 'chat'].map(t => (
              <TabsTrigger key={t} value={t} className="capitalize">
                {t === 'requests' ? 'Client Requests' : t === 'clients' ? 'My Clients' : t === 'meal-plans' ? 'Meal Plans' : t === 'availability' ? 'Availability' : t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            {loading ? (
              <div className="space-y-8">
                <div className="dashboard-grid cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="tile min-h-[7.5rem] space-y-3">
                      <Skeleton className="h-4 w-24 bg-muted" />
                      <Skeleton className="h-8 w-16 bg-muted" />
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="tile min-h-[7.5rem] space-y-3">
                      <Skeleton className="h-5 w-32 bg-muted" />
                      <Skeleton className="h-3 w-20 bg-muted" />
                    </div>
                  ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="tile min-h-[240px] space-y-3">
                      <Skeleton className="h-6 w-40 bg-muted" />
                      <Skeleton className="h-14 w-full bg-muted" />
                      <Skeleton className="h-14 w-full bg-muted" />
                      <Skeleton className="h-14 w-full bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <StaggerChildren className="dashboard-grid cols-3">
                  <StatCard label="Active Clients" value={clients.length} icon={Users} variant="primary" />
                  <StatCard label="Pending Requests" value={requests.length} icon={ClipboardList} variant="amber" />
                  <StatCard label="Active Plans" value={activePlanCount} icon={Dumbbell} variant="sky" />
                </StaggerChildren>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { href: '/chat', label: 'Message Clients', desc: `${conversations.filter((c) => c.unreadCount > 0).length} unread` },
                    { href: '/trainer-dashboard/exercises', label: 'Exercise Library', desc: 'Build programs' },
                    { href: '/trainer-dashboard/nutrition', label: 'Meal Catalog', desc: 'Recommend foods' },
                    { href: '/live-sessions', label: 'Live Sessions', desc: 'Host remote coaching' },
                  ].map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="tile interactive-lift min-h-[8.5rem] justify-between"
                    >
                      <p className="break-words font-bold leading-snug text-white">{action.label}</p>
                      <p className="text-xs leading-snug text-muted-foreground">{action.desc}</p>
                    </Link>
                  ))}
                </div>

                {requests.length > 0 && (
                  <div className="tile border-amber-500/20 bg-amber-500/5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-amber-300">Pending coaching requests</p>
                        <p className="mt-1 text-sm text-muted-foreground">{requests.length} athlete{requests.length === 1 ? '' : 's'} waiting for a response</p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-300">{requests.length} new</Badge>
                    </div>
                    <div className="mt-4 space-y-2">
                      {requests.slice(0, 3).map((req) => (
                        <div key={req._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
                          <div>
                            <p className="font-medium text-white">{req.userId?.fullName}</p>
                            <p className="text-xs text-muted-foreground">{req.userId?.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAccept(req._id)} className="bg-primary text-black hover:brightness-95">Accept</Button>
                            <Button size="sm" variant="outline" onClick={() => handleDecline(req._id)}>Decline</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="tile min-h-[240px]">
                    <h2 className="mb-3 text-lg font-bold">Active Clients</h2>
                    {clients.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active clients yet. Accept requests to get started.</p>
                    ) : (
                      <div className="space-y-2">
                        {clients.slice(0, 5).map((client) => (
                          <div key={client._id} className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3">
                            <div>
                              <p className="font-medium text-white">{client.userId?.fullName}</p>
                              <p className="text-xs text-muted-foreground">{client.userId?.email}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedClient(client); setPlanModalOpen(true) }}>
                              Plan
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="tile min-h-[240px]">
                    <h2 className="mb-3 text-lg font-bold">Recent Messages</h2>
                    {conversations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No conversations yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {conversations.slice(0, 5).map((conversation) => (
                          <Link
                            key={conversation._id}
                            href={`/chat/${conversation._id}`}
                            className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3 hover:border-primary/30"
                          >
                            <div>
                              <div className="font-medium">{conversation.otherUser?.fullName}</div>
                              <div className="text-sm text-muted-foreground">{conversation.lastMessage || 'No messages yet'}</div>
                            </div>
                            {conversation.unreadCount > 0 && (
                              <Badge className="bg-primary text-black">{conversation.unreadCount}</Badge>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/60 p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full bg-muted" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-muted" />
                        <Skeleton className="h-3 w-40 bg-muted" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-20 bg-muted" />
                      <Skeleton className="h-9 w-20 bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : requests.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No pending requests</p>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <Card key={req._id}>
                    <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar
                          name={req.userId?.fullName}
                          avatarUrl={req.userId?.avatarUrl || req.userId?.profileImage}
                          size="md"
                        />
                        <div>
                          <div className="font-bold">{req.userId?.fullName}</div>
                          <div className="text-muted-foreground text-sm">{req.userId?.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleAccept(req._id)} className="bg-primary text-black hover:brightness-95">
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
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/60 p-6">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-36 bg-muted" />
                      <Skeleton className="h-3 w-44 bg-muted" />
                      <Skeleton className="h-5 w-16 bg-muted" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-28 bg-muted" />
                      <Skeleton className="h-9 w-28 bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : clients.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No active clients yet</p>
            ) : (
              <div className="space-y-4">
                {clients.map(client => (
                  <Card key={client._id}>
                    <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar
                          name={client.userId?.fullName}
                          avatarUrl={client.userId?.avatarUrl || client.userId?.profileImage}
                          size="md"
                        />
                        <div>
                          <div className="font-bold">{client.userId?.fullName}</div>
                          <div className="text-muted-foreground text-sm">{client.userId?.email}</div>
                          <Badge className="mt-2 bg-primary/10 text-primary">{client.status}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => viewClientProgress(client)} variant="outline">
                          View Progress
                        </Button>
                        <Button onClick={() => { setSelectedClient(client); setPlanModalOpen(true) }}
                          className="bg-primary text-black hover:brightness-95">
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

          <TabsContent value="meal-plans">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 bg-muted" />
                <Skeleton className="h-24 bg-muted" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Assigned meal plans</h2>
                    <p className="text-sm text-muted-foreground">Create and assign nutrition plans to active clients.</p>
                  </div>
                  <Button
                    onClick={() => {
                      setMealPlanForm((f) => ({
                        ...f,
                        clientRelationshipId: clients[0]?._id || '',
                      }))
                      setMealPlanModalOpen(true)
                    }}
                    className="bg-primary text-black hover:brightness-95"
                    disabled={clients.length === 0}
                  >
                    <Utensils className="size-4" />
                    Create Meal Plan
                  </Button>
                </div>
                {clients.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">
                    Accept a client request first to assign meal plans.
                  </p>
                ) : mealPlans.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">
                    No meal plans yet. Create one and assign it to a client.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {mealPlans.map((plan) => {
                      const clientName =
                        typeof plan.userId === 'object' && plan.userId?.fullName
                          ? plan.userId.fullName
                          : 'Client'
                      return (
                        <Card key={plan._id}>
                          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                            <div>
                              <div className="font-bold text-white">{plan.title}</div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                {clientName} · {plan.goal?.replace(/_/g, ' ')} · {plan.dailyCalories} kcal
                                {plan.durationDays ? ` · ${plan.durationDays} days` : ''}
                              </div>
                            </div>
                            <Badge className="capitalize bg-primary/10 text-primary">{plan.status}</Badge>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="availability">
            <AvailabilityTab />
          </TabsContent>

          <TabsContent value="chat">
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-card/60 p-4">
                    <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32 bg-muted" />
                      <Skeleton className="h-3 w-48 bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No conversations yet</p>
            ) : (
              <div className="space-y-2">
                {conversations.map(c => (
                  <Link key={c._id} href={`/chat/${c._id}`}
                    className="flex items-center gap-4 p-4 bg-card/60 border border-border rounded-xl hover:border-primary/30 transition-colors">
                    <Avatar
                      name={c.otherUser?.fullName}
                      avatarUrl={c.otherUser?.avatarUrl || c.otherUser?.profileImage}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{c.otherUser?.fullName}</div>
                      <div className="text-muted-foreground text-sm truncate">{c.lastMessage || 'No messages yet'}</div>
                    </div>
                    {c.unreadCount > 0 && (
                      <Badge className="bg-primary text-black">{c.unreadCount}</Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="bg-card/60 border-border text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Workout Plan</DialogTitle>
            <p className="text-muted-foreground text-sm">For {selectedClient?.userId?.fullName}</p>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div>
              <Label>Plan Title</Label>
              <Input value={planForm.title} onChange={e => setPlanForm(f => ({ ...f, title: e.target.value }))}
                className="mt-1 bg-background border-border" placeholder="8-Week Strength Builder" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (weeks)</Label>
                <Input type="number" value={planForm.durationWeeks}
                  onChange={e => setPlanForm(f => ({ ...f, durationWeeks: e.target.value }))}
                  className="mt-1 bg-background border-border" />
              </div>
              <div>
                <Label>Difficulty</Label>
                <select value={planForm.difficulty} onChange={e => setPlanForm(f => ({ ...f, difficulty: e.target.value }))}
                  className="mt-1 w-full h-8 rounded-lg bg-background border border-border px-2 text-sm">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Goal</Label>
              <select value={planForm.goal} onChange={e => setPlanForm(f => ({ ...f, goal: e.target.value }))}
                className="mt-1 w-full h-8 rounded-lg bg-background border border-border px-2 text-sm">
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
                <div key={day.day} className="rounded-xl border border-border bg-background p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-medium">{day.day}</span>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={day.isRestDay}
                        onChange={(event) => updateDay(dayIndex, { isRestDay: event.target.checked })}
                        className="accent-primary"
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
                           
                          />
                          <Input
                            aria-label="Sets"
                            type="number"
                            min="1"
                            value={exercise.sets}
                            onChange={(event) => updateExercise(dayIndex, exerciseIndex, { sets: Number(event.target.value) })}
                           
                          />
                          <Input
                            aria-label="Repetitions"
                            placeholder="Reps"
                            value={exercise.reps}
                            onChange={(event) => updateExercise(dayIndex, exerciseIndex, { reps: event.target.value })}
                           
                          />
                          <Input
                            aria-label="Rest seconds"
                            type="number"
                            min="0"
                            value={exercise.restSeconds}
                            onChange={(event) => updateExercise(dayIndex, exerciseIndex, { restSeconds: Number(event.target.value) })}
                           
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
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={sendPlanViaChat}
                onChange={(e) => setSendPlanViaChat(e.target.checked)}
                className="accent-primary"
                disabled={!selectedClient?.conversationId}
              />
              Send plan to client via chat{!selectedClient?.conversationId ? ' (no conversation yet)' : ''}
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlanModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating} className="bg-primary text-black hover:brightness-95">
                {creating ? 'Creating...' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={mealPlanModalOpen} onOpenChange={setMealPlanModalOpen}>
        <DialogContent className="bg-card/60 border-border text-white sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Meal Plan</DialogTitle>
            <p className="text-sm text-muted-foreground">Assign a daily nutrition template to a client.</p>
          </DialogHeader>
          <form onSubmit={handleCreateMealPlan} className="space-y-4">
            <div>
              <Label>Plan Name</Label>
              <Input
                value={mealPlanForm.title}
                onChange={(e) => setMealPlanForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 bg-background border-border"
                placeholder="7-Day Cut Plan"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Goal</Label>
                <select
                  value={mealPlanForm.goal}
                  onChange={(e) => setMealPlanForm((f) => ({ ...f, goal: e.target.value }))}
                  className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option value="weight_loss">Weight Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={mealPlanForm.durationDays}
                  onChange={(e) => setMealPlanForm((f) => ({ ...f, durationDays: e.target.value }))}
                  className="mt-1 bg-background border-border"
                />
              </div>
            </div>
            <div>
              <Label>Assign to Client</Label>
              <select
                value={mealPlanForm.clientRelationshipId}
                onChange={(e) => setMealPlanForm((f) => ({ ...f, clientRelationshipId: e.target.value }))}
                className="mt-1 h-8 w-full rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">Select client…</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.userId?.fullName || client.userId?.email || 'Client'}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <Label>Daily meals</Label>
              {mealPlanMeals.map((meal, index) => (
                <div key={meal.mealType} className="rounded-xl border border-border bg-background p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
                    {meal.mealType}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-[1fr_70px_70px_70px_70px]">
                    <Input
                      placeholder="Food name"
                      value={meal.name}
                      onChange={(e) => updateMealPlanMeal(index, { name: e.target.value })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Cal"
                      aria-label={`${meal.mealType} calories`}
                      value={meal.calories || ''}
                      onChange={(e) => updateMealPlanMeal(index, { calories: Number(e.target.value) || 0 })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="P"
                      aria-label={`${meal.mealType} protein`}
                      value={meal.protein || ''}
                      onChange={(e) => updateMealPlanMeal(index, { protein: Number(e.target.value) || 0 })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="C"
                      aria-label={`${meal.mealType} carbs`}
                      value={meal.carbs || ''}
                      onChange={(e) => updateMealPlanMeal(index, { carbs: Number(e.target.value) || 0 })}
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="F"
                      aria-label={`${meal.mealType} fat`}
                      value={meal.fat || ''}
                      onChange={(e) => updateMealPlanMeal(index, { fat: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMealPlanModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingMealPlan} className="bg-primary text-black hover:brightness-95">
                {creatingMealPlan ? 'Creating…' : 'Create & Assign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(progressClient)} onOpenChange={(open) => { if (!open) { setProgressClient(null); setClientProgress(null) } }}>
        <DialogContent className="bg-card/60 border-border text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{progressClient?.userId?.fullName}&apos;s Progress</DialogTitle>
          </DialogHeader>
          {loadingProgress ? (
            <Skeleton className="h-48 bg-muted" />
          ) : clientProgress ? (
            <div className="space-y-6">
              {(clientProgress.permissions as { canViewProgress?: boolean })?.canViewProgress ? (
                <>
                  {(clientProgress.activePlan as { title?: string } | null)?.title && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Active Plan</p>
                      <p className="font-bold text-primary">{(clientProgress.activePlan as { title: string }).title}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold mb-2">Recent Workouts</h3>
                    {Array.isArray(clientProgress.recentWorkouts) && clientProgress.recentWorkouts.length > 0 ? (
                      <div className="space-y-2">
                        {(clientProgress.recentWorkouts as Array<{ _id: string; date: string; planTitle?: string }>).map(w => (
                          <div key={w._id} className="rounded-lg border border-border p-3 text-sm">
                            <span className="font-medium">{w.planTitle || 'Workout'}</span>
                            <span className="text-muted-foreground ml-2">{new Date(w.date).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No workouts logged yet.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold mb-2">Body Metrics</h3>
                    {Array.isArray(clientProgress.progress) && clientProgress.progress.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-muted-foreground text-left border-b border-border">
                              <th className="pb-2 pr-3">Date</th>
                              <th className="pb-2 pr-3">Weight</th>
                              <th className="pb-2">Waist</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(clientProgress.progress as Array<{ _id: string; date: string; weight?: number; waist?: number }>).slice(0, 5).map(r => (
                              <tr key={r._id} className="border-b border-border/50">
                                <td className="py-2 pr-3">{new Date(r.date).toLocaleDateString()}</td>
                                <td className="py-2 pr-3">{r.weight ? `${r.weight} kg` : '—'}</td>
                                <td className="py-2">{r.waist ? `${r.waist} cm` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No progress records yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Progress viewing is not enabled for this client.</p>
              )}
              {(clientProgress.permissions as { canViewNutrition?: boolean })?.canViewNutrition && (
                <div>
                  <h3 className="font-bold mb-2">Today&apos;s Nutrition</h3>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-primary font-bold text-xl">
                      {(clientProgress.todayNutrition as { totals?: { calories?: number } })?.totals?.calories ?? 0} kcal
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">logged today</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}


