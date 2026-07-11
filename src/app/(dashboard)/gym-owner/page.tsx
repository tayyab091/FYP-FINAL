'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

export default function GymOwnerPage() {
  const { user, isLoading: authLoading } = useAuth()
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

  if (authLoading) return <Loader />
  if (!user || user.role !== 'gym_owner') return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center">
      <p className="text-[#a0a0a0]">Gym owner access only</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-8 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Gym Owner Dashboard</h1>
            <p className="text-[#a0a0a0]">Manage {gymName}</p>
          </div>
          <Link href="/" className="text-[#a0a0a0] hover:text-white text-sm">← Home</Link>
        </div>

        <Tabs defaultValue="gym">
          <TabsList className="bg-[#111] border border-[#1a1a1a] mb-8">
            {['gym', 'trainers', 'analytics'].map(t => (
              <TabsTrigger key={t} value={t} className="capitalize data-active:bg-[#00ff87]/10 data-active:text-[#00ff87]">
                {t === 'gym' ? 'My Gym' : t === 'trainers' ? 'My Trainers' : 'Analytics'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="gym">
            <Card className="bg-[#111] border-[#1a1a1a] text-white">
              <CardHeader>
                <CardTitle className="text-2xl">{gymName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-6">
                  <div>
                    <div className="text-[#555] text-sm">Total Trainers</div>
                    <div className="text-3xl font-black text-[#00ff87]">{trainers.length}</div>
                  </div>
                  <div>
                    <div className="text-[#555] text-sm">Verified Trainers</div>
                    <div className="text-3xl font-black text-[#00ff87]">{verifiedCount}</div>
                  </div>
                  <div>
                    <div className="text-[#555] text-sm">Avg Rating</div>
                    <div className="text-3xl font-black text-[#00ff87]">{avgRating}</div>
                  </div>
                </div>
                <form onSubmit={saveGym} className="grid gap-4 border-t border-[#1a1a1a] pt-6 sm:grid-cols-2">
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
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]"
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
                      className="mt-1 w-full rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm outline-none focus:border-[#00ff87]"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between gap-3">
                    <Badge variant="outline" className="capitalize">
                      {gym.verificationStatus || 'pending'}
                    </Badge>
                    <Button type="submit" disabled={savingGym} className="bg-[#00ff87] text-black hover:bg-[#00cc6a]">
                      {savingGym ? 'Saving...' : 'Save Gym Details'}
                    </Button>
                  </div>
                </form>
                <div className="border-t border-[#1a1a1a] pt-6">
                  <h3 className="font-bold mb-4">Add Trainer to Gym</h3>
                  <form onSubmit={handleAddTrainer} className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <Label htmlFor="email" className="sr-only">Trainer Email</Label>
                      <Input id="email" type="email" placeholder="trainer@email.com" value={trainerEmail}
                        onChange={e => setTrainerEmail(e.target.value)}
                        className="bg-[#0a0a0a] border-[#2a2a2a]" />
                    </div>
                    <Button type="submit" disabled={adding} className="bg-[#00ff87] text-black hover:bg-[#00cc6a]">
                      {adding ? 'Adding...' : 'Add Trainer'}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trainers">
            {loading ? <Skeleton className="h-48 bg-[#1a1a1a]" /> : trainers.length === 0 ? (
              <p className="text-[#a0a0a0] text-center py-12">No trainers linked to your gym yet</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {trainers.map(t => (
                  <Card key={t._id} className="bg-[#111] border-[#1a1a1a] text-white">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#00ff87] font-bold">
                          {t.name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold">{t.name}</div>
                          <div className="text-[#555] text-sm">{t.email}</div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.specialty?.slice(0, 3).map(s => (
                              <Badge key={s} className="bg-[#00ff87]/10 text-[#00ff87] text-xs">{s}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-[#00ff87]">★ {t.rating?.toFixed(1)}</span>
                            <Badge variant="outline" className={t.isFullyVerified ? 'border-[#00ff87]/30 text-[#00ff87]' : 'border-yellow-500/30 text-yellow-400'}>
                              {t.isFullyVerified ? 'Verified' : 'Pending'}
                            </Badge>
                          </div>
                          <div className="mt-3 flex gap-2">
                            {!t.isFullyVerified && (
                              <Button
                                size="sm"
                                onClick={() => updateTrainer(t._id, 'approve')}
                                className="bg-[#00ff87] text-black hover:bg-[#00cc6a]"
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
            {loading ? <Skeleton className="h-64 bg-[#1a1a1a]" /> : trainers.length === 0 ? (
              <p className="text-[#a0a0a0] text-center py-12">Add trainers to see analytics</p>
            ) : (
              <div className="space-y-8">
                <div className="grid sm:grid-cols-3 gap-6">
                  <StatCard label="Total Clients" value={trainers.reduce((s, t) => s + (t.totalClients || 0), 0)} />
                  <StatCard label="Active Trainers" value={trainers.filter(t => t.isActive).length} />
                  <StatCard label="Featured Trainers" value={trainers.filter(t => t.isFeatured).length} />
                </div>
                <Card className="bg-[#111] border-[#1a1a1a] text-white">
                  <CardHeader><CardTitle>Trainer Performance</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis dataKey="name" stroke="#555" fontSize={12} />
                        <YAxis stroke="#555" fontSize={12} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8 }} />
                        <Bar dataKey="clients" fill="#00ff87" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="rating" fill="#00bfff" radius={[4, 4, 0, 0]} />
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
