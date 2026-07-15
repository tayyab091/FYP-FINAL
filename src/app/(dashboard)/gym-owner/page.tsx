'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Trainer } from '@/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartTheme } from '@/lib/chart-theme'
import { Building2, Users, Star } from 'lucide-react'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { StatCard } from '@/components/shared/StatCard'
import { StaggerChildren } from '@/components/motion'

interface GymDetails {
  name: string
  address: string
  country: string
  description: string
  phone: string
  email: string
  logo: string
  verificationStatus?: string
}

const GYM_TABS = ['gym', 'trainers', 'analytics'] as const
type GymTab = (typeof GYM_TABS)[number]

function isGymTab(value: string | null): value is GymTab {
  return GYM_TABS.includes(value as GymTab)
}

export default function GymOwnerPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: GymTab = isGymTab(tabParam) ? tabParam : 'gym'
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [trainerEmail, setTrainerEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [savingGym, setSavingGym] = useState(false)
  const [gym, setGym] = useState<GymDetails>({
    name: '',
    address: '',
    country: 'Pakistan',
    description: '',
    phone: '',
    email: '',
    logo: '',
  })

  const setTab = (value: string) => {
    const next = isGymTab(value) ? value : 'gym'
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'gym') params.delete('tab')
    else params.set('tab', next)
    const qs = params.toString()
    router.replace(qs ? `/gym-owner?${qs}` : '/gym-owner', { scroll: false })
  }

  const loadTrainers = () => {
    setLoading(true)
    fetch('/api/gym-owner/trainers')
      .then(r => r.ok ? r.json() : [])
      .then(data => setTrainers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  const loadGym = () => {
    fetch('/api/gym-owner/gym')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setGym({
          name: data.name || '',
          address: data.address || '',
          country: data.country || 'Pakistan',
          description: data.description || '',
          phone: data.phone || '',
          email: data.email || '',
          logo: data.logo || '',
          verificationStatus: data.verificationStatus,
        })
      })
  }

  useEffect(() => {
    if (user?.role === 'gym_owner') {
      loadTrainers()
      loadGym()
    }
  }, [user])

  const gymName = gym.name || trainers[0]?.gymName || 'My Gym'
  const verifiedCount = trainers.filter(t => t.isFullyVerified).length
  const avgRating = trainers.length
    ? (trainers.reduce((s, t) => s + (t.rating || 0), 0) / trainers.length).toFixed(1)
    : '—'

  const chartData = trainers.map(t => ({
    name: t.name.split(' ')[0],
    clients: t.totalClients || 0,
    rating: t.rating || 0,
  }))

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trainerEmail) return toast.error('Enter trainer email')
    setAdding(true)
    try {
      const res = await fetch('/api/gym-owner/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success('Trainer added to gym!')
      setTrainerEmail('')
      loadTrainers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add trainer')
    } finally {
      setAdding(false)
    }
  }

  const saveGym = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingGym(true)
    try {
      const res = await fetch('/api/gym-owner/gym', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gym),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setGym((current) => ({ ...current, ...data.gym }))
      toast.success('Gym details updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update gym')
    } finally {
      setSavingGym(false)
    }
  }

  const updateTrainer = async (trainerId: string, action: 'approve' | 'remove') => {
    try {
      const res = await fetch('/api/gym-owner/trainers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success(data.message)
      loadTrainers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Trainer action failed')
    }
  }

  if (authLoading) return <PageLoader />
  if (!user || user.role !== 'gym_owner') return (
    <AccessGate
      icon={Building2}
      title="Gym owner access only"
      description="Manage your facility, trainers, and analytics from the gym owner workspace."
    />
  )

  return (
    <div className="min-h-screen pt-6 pb-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="page-hero mb-6 flex flex-wrap items-start justify-between gap-4 px-6 py-8 sm:px-8">
          <div>
            <p className="eyebrow mb-2">Facility Workspace</p>
            <h1 className="display-title text-3xl md:text-4xl">{gymName}</h1>
            <p className="mt-2 text-muted-foreground">Manage your facility, trainers, and business performance.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/gym-owner/exercises" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-primary/40">
              Exercises
            </Link>
            <Link href="/gym-owner/nutrition" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-primary/40">
              Nutrition
            </Link>
            <Link href="/settings" className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10">
              Gym Settings
            </Link>
          </div>
        </div>

        <StaggerChildren className="dashboard-grid cols-3 mb-8">
          <StatCard label="Total Trainers" value={trainers.length} icon={Users} variant="primary" />
          <StatCard label="Verified" value={verifiedCount} icon={Building2} variant="sky" />
          <StatCard label="Avg Rating" value={avgRating} icon={Star} variant="amber" />
        </StaggerChildren>

        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList className="mb-8">
            {GYM_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="capitalize">
                {t === 'gym' ? 'My Gym' : t === 'trainers' ? 'My Trainers' : 'Analytics'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="gym">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{gymName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-6">
                  <div>
                    <div className="text-muted-foreground text-sm">Total Trainers</div>
                    <div className="text-3xl font-black text-primary">{trainers.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-sm">Verified Trainers</div>
                    <div className="text-3xl font-black text-primary">{verifiedCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-sm">Avg Rating</div>
                    <div className="text-3xl font-black text-primary">{avgRating}</div>
                  </div>
                </div>
                <form onSubmit={saveGym} className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
                  {[
                    { key: 'name', label: 'Gym Name', required: true },
                    { key: 'address', label: 'Address', required: true },
                    { key: 'country', label: 'Country', required: false },
                    { key: 'phone', label: 'Phone', required: false },
                    { key: 'email', label: 'Email', required: false },
                    { key: 'logo', label: 'Logo URL', required: false },
                  ].map((field) => (
                    <div key={field.key}>
                      <Label htmlFor={`gym-${field.key}`}>{field.label}</Label>
                      <Input
                        id={`gym-${field.key}`}
                        type={field.key === 'email' ? 'email' : 'text'}
                        required={field.required}
                        value={gym[field.key as keyof GymDetails] || ''}
                        onChange={(event) => setGym((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))}
                        className="mt-1 bg-background border-border"
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <Label htmlFor="gym-description">Description</Label>
                    <textarea
                      id="gym-description"
                      value={gym.description}
                      onChange={(event) => setGym((current) => ({ ...current, description: event.target.value }))}
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between gap-3">
                    <Badge variant="outline" className="capitalize">
                      {gym.verificationStatus || 'pending'}
                    </Badge>
                    <Button type="submit" disabled={savingGym} className="bg-primary text-black hover:brightness-95">
                      {savingGym ? 'Saving...' : 'Save Gym Details'}
                    </Button>
                  </div>
                </form>
                <div className="border-t border-border pt-6">
                  <h3 className="font-bold mb-4">Add Trainer to Gym</h3>
                  <form onSubmit={handleAddTrainer} className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <Label htmlFor="email" className="sr-only">Trainer Email</Label>
                      <Input id="email" type="email" placeholder="trainer@email.com" value={trainerEmail}
                        onChange={e => setTrainerEmail(e.target.value)}
                        className="bg-background border-border" />
                    </div>
                    <Button type="submit" disabled={adding} className="bg-primary text-black hover:brightness-95">
                      {adding ? 'Adding...' : 'Add Trainer'}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trainers">
            {loading ? <Skeleton className="h-48 bg-muted" /> : trainers.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No trainers linked to your gym yet</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {trainers.map(t => (
                  <Card key={t._id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-primary font-bold">
                          {t.name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">{t.name}</div>
                          <div className="text-muted-foreground text-sm">{t.email}</div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.specialty?.slice(0, 3).map(s => (
                              <Badge key={s} className="bg-primary/10 text-primary text-xs">{s}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-primary">★ {t.rating?.toFixed(1)}</span>
                            <Badge variant="outline" className={t.isFullyVerified ? 'border-primary/30 text-primary' : 'border-yellow-500/30 text-yellow-400'}>
                              {t.isFullyVerified ? 'Verified' : 'Pending'}
                            </Badge>
                          </div>
                          <div className="mt-3 flex gap-2">
                            {!t.isFullyVerified && (
                              <Button
                                size="sm"
                                onClick={() => updateTrainer(t._id, 'approve')}
                                className="bg-primary text-black hover:brightness-95"
                              >
                                Approve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateTrainer(t._id, 'remove')}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            {loading ? <Skeleton className="h-64 bg-muted" /> : trainers.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Add trainers to see analytics</p>
            ) : (
              <div className="space-y-8">
                <StaggerChildren className="dashboard-grid cols-3">
                  <StatCard label="Total Clients" value={trainers.reduce((s, t) => s + (t.totalClients || 0), 0)} icon={Users} variant="primary" />
                  <StatCard label="Active Trainers" value={trainers.filter(t => t.isActive).length} icon={Building2} variant="sky" />
                  <StatCard label="Featured Trainers" value={trainers.filter(t => t.isFeatured).length} icon={Star} variant="amber" />
                </StaggerChildren>
                <Card>
                  <CardHeader><CardTitle>Trainer Performance</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis dataKey="name" stroke={chartTheme.axis} fontSize={12} />
                        <YAxis stroke={chartTheme.axis} fontSize={12} />
                        <Tooltip contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: chartTheme.tooltip.borderRadius }} />
                        <Bar dataKey="clients" fill={chartTheme.primary} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="rating" fill={chartTheme.secondary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


