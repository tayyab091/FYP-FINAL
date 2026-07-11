'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, Users, Dumbbell, Activity, ClipboardCheck } from 'lucide-react'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { StatCard } from '@/components/shared/StatCard'
import { StaggerChildren } from '@/components/motion'
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeaderCell, DataTableRow } from '@/components/shared/DataTable'

interface AdminStats {
  totalUsers: number
  totalTrainers: number
  pendingVerifications: number
  activeRelationships: number
}

interface AdminUser {
  _id: string
  fullName: string
  email: string
  role: string
  country?: string
  isSuspended?: boolean
  createdAt: string
}

interface AdminTrainer {
  _id: string
  name: string
  email: string
  specialty: string[]
  country: string
  isFullyVerified: boolean
  adminVerificationStatus: string
  gymVerificationStatus: string
  rating: number
}

interface AdminGym {
  _id: string
  name: string
  address: string
  country: string
  verificationStatus: string
  ownerId?: { fullName: string; email: string }
}

interface AuditLog {
  _id: string
  action: string
  adminId?: { fullName: string; email: string }
  targetModel?: string
  details?: Record<string, unknown>
  createdAt: string
}

export default function AdminPageClient() {
  const { user, isLoading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab') || 'overview'
  const [activeTab, setActiveTab] = useState(tabParam)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [trainers, setTrainers] = useState<AdminTrainer[]>([])
  const [gyms, setGyms] = useState<AdminGym[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/admin/stats').then(r => r.ok ? r.json() : null),
      fetch('/api/admin/users').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/trainers').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/gyms').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/audit-logs').then(r => r.ok ? r.json() : []),
    ]).then(([s, u, t, g, l]) => {
      setStats(s)
      setUsers(Array.isArray(u) ? u : [])
      setTrainers(Array.isArray(t) ? t : [])
      setGyms(Array.isArray(g) ? g : [])
      setLogs(Array.isArray(l) ? l : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user && ['admin', 'super_admin'].includes(user.role)) loadAll()
  }, [user])

  useEffect(() => {
    setActiveTab(tabParam)
  }, [tabParam])

  const verifyTrainer = async (id: string, action: 'verify' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/trainers/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Trainer ${action === 'verify' ? 'verified' : 'rejected'}`)
      loadAll()
    } catch {
      toast.error('Action failed')
    }
  }

  const toggleSuspendUser = async (id: string, suspend: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success(suspend ? 'User suspended' : 'User unsuspended')
      loadAll()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    }
  }

  const verifyGym = async (id: string, action: 'verify' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/gyms/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Gym ${action === 'verify' ? 'verified' : 'rejected'}`)
      loadAll()
    } catch {
      toast.error('Action failed')
    }
  }

  if (authLoading) return <PageLoader />
  if (!user || !['admin', 'super_admin'].includes(user.role)) return (
    <AccessGate
      icon={Shield}
      title="Admin access only"
      description="This console is restricted to platform administrators."
    />
  )

  return (
    <div className="min-h-screen pt-6 pb-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="page-hero mb-6 px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow mb-2">Command Center</p>
              <h1 className="display-title text-3xl md:text-4xl">
                Welcome back, {user.fullName?.split(' ')[0] || 'Admin'}
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Your operations hub — verify coaches, manage users, and keep the platform healthy.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20">Live platform</Badge>
              <Badge variant="outline" className="border-border capitalize">{user.role.replace('_', ' ')}</Badge>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            setActiveTab(tab)
            router.replace(tab === 'overview' ? '/admin' : `/admin?tab=${tab}`, { scroll: false })
          }}
        >
          <TabsList className="mb-8 flex-wrap h-auto">
            {['overview', 'users', 'trainers', 'gyms', 'audit'].map(t => (
              <TabsTrigger key={t} value={t} className="capitalize">
                {t === 'audit' ? 'Audit Logs' : t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            {loading ? (
              <div className="dashboard-grid cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 bg-muted rounded-2xl" />)}
              </div>
            ) : (
              <>
                <StaggerChildren className="dashboard-grid cols-4">
                  <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={Users} variant="primary" hint="Registered accounts" />
                  <StatCard label="Total Trainers" value={stats?.totalTrainers ?? 0} icon={Dumbbell} variant="sky" hint="Coach profiles" />
                  <StatCard label="Pending Verifications" value={stats?.pendingVerifications ?? 0} icon={ClipboardCheck} variant="amber" hint="Needs your review" />
                  <StatCard label="Active Relationships" value={stats?.activeRelationships ?? 0} icon={Activity} variant="rose" hint="Coach-client pairs" />
                </StaggerChildren>
                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                  <Card className="card-athletic h-full">
                    <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
                      <div>
                        <h3 className="font-bold text-lg text-white">Quick actions</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Jump straight into the work that moves the platform forward.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setActiveTab('trainers')}>Review trainers</Button>
                        <Button size="sm" variant="outline" onClick={() => setActiveTab('gyms')}>Verify gyms</Button>
                        <Button size="sm" variant="outline" onClick={() => setActiveTab('users')}>Manage users</Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="card-athletic h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                          <Shield className="size-5" />
                        </span>
                        <div>
                          <h3 className="font-bold text-white">Platform health</h3>
                          <p className="text-sm text-muted-foreground">All systems operational</p>
                        </div>
                      </div>
                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Pending verifications</span><span className="font-bold text-amber-400">{stats?.pendingVerifications ?? 0}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Active coaching links</span><span className="font-bold text-primary">{stats?.activeRelationships ?? 0}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Trainer network</span><span className="font-bold text-sky-400">{stats?.totalTrainers ?? 0}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="users">
            {loading ? <Skeleton className="h-64 bg-muted" /> : (
              <Card>
                <CardContent className="pt-6">
                  <DataTable>
                    <DataTableHead>
                      <DataTableHeaderCell>Name</DataTableHeaderCell>
                      <DataTableHeaderCell>Email</DataTableHeaderCell>
                      <DataTableHeaderCell>Role</DataTableHeaderCell>
                      <DataTableHeaderCell>Status</DataTableHeaderCell>
                      <DataTableHeaderCell>Actions</DataTableHeaderCell>
                    </DataTableHead>
                    <DataTableBody>
                      {users.map(u => (
                        <DataTableRow key={u._id}>
                          <DataTableCell className="font-medium">{u.fullName}</DataTableCell>
                          <DataTableCell className="text-muted-foreground">{u.email}</DataTableCell>
                          <DataTableCell>
                            <Badge variant="outline" className="border-border capitalize">{u.role}</Badge>
                          </DataTableCell>
                          <DataTableCell>
                            <Badge className={u.isSuspended ? 'bg-red-500/10 text-red-400' : 'bg-primary/10 text-primary'}>
                              {u.isSuspended ? 'Suspended' : 'Active'}
                            </Badge>
                          </DataTableCell>
                          <DataTableCell>
                            {!['admin', 'super_admin'].includes(u.role) && (
                              <Button
                                size="sm"
                                variant={u.isSuspended ? 'outline' : 'destructive'}
                                onClick={() => toggleSuspendUser(u._id, !u.isSuspended)}
                              >
                                {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                              </Button>
                            )}
                          </DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trainers">
            {loading ? <Skeleton className="h-64 bg-muted" /> : (
              <div className="space-y-4">
                {trainers.map(t => (
                  <Card key={t._id}>
                    <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <div className="font-bold">{t.name}</div>
                        <div className="text-muted-foreground text-sm">{t.email} · {t.country}</div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {t.specialty?.map(s => (
                            <Badge key={s} className="bg-primary/10 text-primary text-xs">{s}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="border-border text-xs">Admin: {t.adminVerificationStatus}</Badge>
                          <Badge variant="outline" className="border-border text-xs">Gym: {t.gymVerificationStatus}</Badge>
                        </div>
                      </div>
                      {!t.isFullyVerified && (
                        <div className="flex gap-2">
                          <Button onClick={() => verifyTrainer(t._id, 'verify')} className="bg-primary text-black hover:brightness-95">Verify</Button>
                          <Button onClick={() => verifyTrainer(t._id, 'reject')} variant="destructive">Reject</Button>
                        </div>
                      )}
                      {t.isFullyVerified && <Badge className="bg-primary/10 text-primary">Verified</Badge>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gyms">
            {loading ? <Skeleton className="h-64 bg-muted" /> : (
              <div className="space-y-4">
                {gyms.map(g => (
                  <Card key={g._id}>
                    <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <div className="font-bold">{g.name}</div>
                        <div className="text-muted-foreground text-sm">{g.address}, {g.country}</div>
                        <div className="text-muted-foreground text-sm mt-1">Owner: {g.ownerId?.fullName || '—'}</div>
                        <Badge className="mt-2 capitalize" variant="outline">{g.verificationStatus}</Badge>
                      </div>
                      {g.verificationStatus === 'pending' && (
                        <div className="flex gap-2">
                          <Button onClick={() => verifyGym(g._id, 'verify')} className="bg-primary text-black hover:brightness-95">Verify</Button>
                          <Button onClick={() => verifyGym(g._id, 'reject')} variant="destructive">Reject</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit">
            {loading ? <Skeleton className="h-64 bg-muted" /> : (
              <div className="space-y-3">
                {logs.map(log => (
                  <Card key={log._id}>
                    <CardContent className="pt-4 flex justify-between items-start gap-4">
                      <div>
                        <div className="font-medium text-primary">{log.action}</div>
                        <div className="text-muted-foreground text-sm">
                          by {log.adminId?.fullName || 'System'} · {log.targetModel}
                        </div>
                      </div>
                      <div className="text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
