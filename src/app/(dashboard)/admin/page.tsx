'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

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

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth()
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

  if (authLoading) return <Loader />
  if (!user || !['admin', 'super_admin'].includes(user.role)) return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center">
      <p className="text-[#a0a0a0]">Admin access only</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-8 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Admin Panel</h1>
            <p className="text-[#a0a0a0]">Platform management & moderation</p>
          </div>
          <Link href="/" className="text-[#a0a0a0] hover:text-white text-sm">← Home</Link>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="bg-[#111] border border-[#1a1a1a] mb-8 flex-wrap h-auto">
            {['overview', 'users', 'trainers', 'gyms', 'audit'].map(t => (
              <TabsTrigger key={t} value={t} className="capitalize data-active:bg-[#00ff87]/10 data-active:text-[#00ff87]">
                {t === 'audit' ? 'Audit Logs' : t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            {loading ? <Skeleton className="h-32 bg-[#1a1a1a]" /> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
                <StatCard label="Total Trainers" value={stats?.totalTrainers ?? 0} />
                <StatCard label="Pending Verifications" value={stats?.pendingVerifications ?? 0} />
                <StatCard label="Active Relationships" value={stats?.activeRelationships ?? 0} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            {loading ? <Skeleton className="h-64 bg-[#1a1a1a]" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] text-[#a0a0a0] text-left">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Role</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} className="border-b border-[#1a1a1a]/50">
                        <td className="py-3 pr-4 font-medium">{u.fullName}</td>
                        <td className="py-3 pr-4 text-[#a0a0a0]">{u.email}</td>
                        <td className="py-3 pr-4"><Badge variant="outline" className="border-[#2a2a2a] capitalize">{u.role}</Badge></td>
                        <td className="py-3">
                          <Badge className={u.isSuspended ? 'bg-red-500/10 text-red-400' : 'bg-[#00ff87]/10 text-[#00ff87]'}>
                            {u.isSuspended ? 'Suspended' : 'Active'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trainers">
            {loading ? <Skeleton className="h-64 bg-[#1a1a1a]" /> : (
              <div className="space-y-4">
                {trainers.map(t => (
                  <Card key={t._id} className="bg-[#111] border-[#1a1a1a] text-white">
                    <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <div className="font-bold">{t.name}</div>
                        <div className="text-[#555] text-sm">{t.email} · {t.country}</div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {t.specialty?.map(s => (
                            <Badge key={s} className="bg-[#00ff87]/10 text-[#00ff87] text-xs">{s}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="border-[#2a2a2a] text-xs">Admin: {t.adminVerificationStatus}</Badge>
                          <Badge variant="outline" className="border-[#2a2a2a] text-xs">Gym: {t.gymVerificationStatus}</Badge>
                        </div>
                      </div>
                      {!t.isFullyVerified && (
                        <div className="flex gap-2">
                          <Button onClick={() => verifyTrainer(t._id, 'verify')} className="bg-[#00ff87] text-black hover:bg-[#00cc6a]">Verify</Button>
                          <Button onClick={() => verifyTrainer(t._id, 'reject')} variant="destructive">Reject</Button>
                        </div>
                      )}
                      {t.isFullyVerified && <Badge className="bg-[#00ff87]/10 text-[#00ff87]">Verified</Badge>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gyms">
            {loading ? <Skeleton className="h-64 bg-[#1a1a1a]" /> : (
              <div className="space-y-4">
                {gyms.map(g => (
                  <Card key={g._id} className="bg-[#111] border-[#1a1a1a] text-white">
                    <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <div className="font-bold">{g.name}</div>
                        <div className="text-[#555] text-sm">{g.address}, {g.country}</div>
                        <div className="text-[#555] text-sm mt-1">Owner: {g.ownerId?.fullName || '—'}</div>
                        <Badge className="mt-2 capitalize" variant="outline">{g.verificationStatus}</Badge>
                      </div>
                      {g.verificationStatus === 'pending' && (
                        <div className="flex gap-2">
                          <Button onClick={() => verifyGym(g._id, 'verify')} className="bg-[#00ff87] text-black hover:bg-[#00cc6a]">Verify</Button>
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
            {loading ? <Skeleton className="h-64 bg-[#1a1a1a]" /> : (
              <div className="space-y-3">
                {logs.map(log => (
                  <Card key={log._id} className="bg-[#111] border-[#1a1a1a] text-white">
                    <CardContent className="pt-4 flex justify-between items-start gap-4">
                      <div>
                        <div className="font-medium text-[#00ff87]">{log.action}</div>
                        <div className="text-[#555] text-sm">
                          by {log.adminId?.fullName || 'System'} · {log.targetModel}
                        </div>
                      </div>
                      <div className="text-[#555] text-xs whitespace-nowrap">
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
