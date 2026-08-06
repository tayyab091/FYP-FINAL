'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { Avatar } from '@/components/shared/Avatar'
import { ArrowLeft, Shield } from 'lucide-react'

const VALID_TABS = ['overview', 'users', 'trainers', 'gyms', 'verifications', 'audit', 'subscriptions'] as const

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'trainers', label: 'Trainers' },
  { id: 'gyms', label: 'Gyms' },
  { id: 'verifications', label: 'Verifications' },
  { id: 'audit', label: 'Audit' },
  { id: 'subscriptions', label: 'Subscriptions' },
]

interface AdminStats {
  totalUsers?: number
  totalTrainers?: number
  pendingVerifications?: number
  activeRelationships?: number
}

interface AdminUser {
  _id: string
  fullName: string
  email: string
  role: string
  avatarUrl?: string
  profileImage?: string
  isSuspended?: boolean
  createdAt: string
  subscription?: {
    plan?: string
    status?: string
    startDate?: string | null
    endDate?: string | null
  }
}

interface SubscriptionRow {
  _id: string
  fullName: string
  email: string
  role: string
  subscription: {
    plan: string
    status: string
    startDate?: string | null
    endDate?: string | null
  }
  effective?: { plan: string; status: string }
}

interface AdminTrainer {
  _id: string
  name: string
  email: string
  profileImage?: string
  userId?: { profileImage?: string; avatarUrl?: string }
  specialty?: string[]
  adminVerificationStatus?: string
  gymVerificationStatus?: string
  isFullyVerified?: boolean
}

interface AdminGym {
  _id: string
  name: string
  address?: string
  country?: string
  verificationStatus?: string
  ownerId?: { fullName?: string }
}

interface AuditLog {
  _id: string
  action: string
  adminId?: { fullName?: string } | string
  targetModel?: string
  targetId?: { toString?: () => string } | string
  createdAt: string
}

export default function AdminPageClient() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') || 'overview'
  const active = VALID_TABS.includes(tabParam as (typeof VALID_TABS)[number]) ? tabParam : 'overview'
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [trainers, setTrainers] = useState<AdminTrainer[]>([])
  const [gyms, setGyms] = useState<AdminGym[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [subCounts, setSubCounts] = useState({ basic: 0, pro: 0, elite: 0 })
  const [subActionId, setSubActionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const setActive = (id: string) => {
    if (id === 'overview') router.replace('/admin')
    else router.replace(`/admin?tab=${id}`)
  }

  useEffect(() => {
    if (!user || !['admin', 'super_admin'].includes(user.role)) return
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    Promise.all([
      fetch('/api/admin/stats', { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/admin/users', { signal: controller.signal }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/admin/trainers', { signal: controller.signal }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/admin/gyms', { signal: controller.signal }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/admin/audit-logs', { signal: controller.signal }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/admin/subscriptions', { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([s, u, t, g, a, subs]) => {
        setStats(s)
        setUsers(Array.isArray(u) ? u : [])
        setTrainers(Array.isArray(t) ? t : [])
        setGyms(Array.isArray(g) ? g : [])
        setAuditLogs(Array.isArray(a) ? a : [])
        if (subs && Array.isArray(subs.subscriptions)) {
          setSubscriptions(subs.subscriptions)
          setSubCounts(subs.counts || { basic: 0, pro: 0, elite: 0 })
        }
      })
      .finally(() => {
        setLoading(false)
        clearTimeout(timeout)
      })

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [user])

  const verifyTrainer = async (id: string, action: 'verify' | 'reject') => {
    const res = await fetch(`/api/admin/trainers/${id}/verify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      toast.success(`Trainer ${action === 'verify' ? 'verified' : 'rejected'}`)
      setTrainers((t) =>
        t.map((tr) =>
          tr._id === id
            ? {
                ...tr,
                adminVerificationStatus: action === 'verify' ? 'approved' : 'rejected',
                isFullyVerified: action === 'verify',
              }
            : tr,
        ),
      )
    } else {
      toast.error('Action failed')
    }
  }

  const verifyGym = async (id: string, action: 'verify' | 'reject') => {
    const res = await fetch(`/api/admin/gyms/${id}/verify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      toast.success(`Gym ${action === 'verify' ? 'verified' : 'rejected'}`)
      setGyms((g) =>
        g.map((gym) =>
          gym._id === id
            ? { ...gym, verificationStatus: action === 'verify' ? 'verified' : 'rejected' }
            : gym,
        ),
      )
    } else {
      toast.error('Action failed')
    }
  }

  const suspendUser = async (id: string, suspend: boolean) => {
    const res = await fetch(`/api/admin/users/${id}/suspend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend }),
    })
    if (res.ok) {
      toast.success(suspend ? 'User suspended' : 'User reactivated')
      setUsers((u) => u.map((row) => (row._id === id ? { ...row, isSuspended: suspend } : row)))
    } else {
      toast.error('Action failed')
    }
  }

  const refreshSubscriptions = async () => {
    const [subsRes, usersRes, auditRes] = await Promise.all([
      fetch('/api/admin/subscriptions').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/admin/users').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/admin/audit-logs').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
    if (subsRes && Array.isArray(subsRes.subscriptions)) {
      setSubscriptions(subsRes.subscriptions)
      setSubCounts(subsRes.counts || { basic: 0, pro: 0, elite: 0 })
    }
    if (Array.isArray(usersRes)) setUsers(usersRes)
    if (Array.isArray(auditRes)) setAuditLogs(auditRes)
  }

  const manageSubscription = async (
    userId: string,
    action: 'grant' | 'revoke' | 'renew' | 'set',
    plan?: 'basic' | 'pro' | 'elite',
    months = 1,
  ) => {
    setSubActionId(userId)
    try {
      const res = await fetch(`/api/admin/subscriptions/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, plan, months }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.message || 'Subscription action failed')
        return
      }
      const labels: Record<string, string> = {
        grant: plan === 'elite' ? 'Elite granted' : plan === 'pro' ? 'Pro granted' : 'Plan granted',
        set: `Plan set to ${plan || 'basic'}`,
        renew: 'Subscription renewed (+1 month)',
        revoke: 'Revoked to Basic',
      }
      toast.success(labels[action] || 'Subscription updated')
      await refreshSubscriptions()
    } catch {
      toast.error('Network error')
    } finally {
      setSubActionId(null)
    }
  }

  if (authLoading) return <PageLoader />
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <AccessGate
        icon={Shield}
        title="Admin only"
        description="You need an admin account to access this console."
      />
    )
  }

  const pendingTrainers = trainers.filter((t) => t.adminVerificationStatus !== 'approved')
  const pendingGyms = gyms.filter((g) => g.verificationStatus === 'pending')
  const pendingCount = pendingTrainers.length + pendingGyms.length
  const pendingTileCount =
    typeof stats?.pendingVerifications === 'number' ? stats.pendingVerifications : pendingCount

  const ROLE_COLORS: Record<string, string> = {
    user: 'bg-blue-500/20 text-blue-400',
    trainer: 'bg-[#00ff87]/20 text-[#00ff87]',
    gym_owner: 'bg-orange-500/20 text-orange-400',
    admin: 'bg-purple-500/20 text-purple-400',
    super_admin: 'bg-red-500/20 text-red-400',
  }

  const PLAN_COLORS: Record<string, string> = {
    basic: 'bg-[#a0a0a0]/20 text-[#a0a0a0]',
    pro: 'bg-[#00ff87]/20 text-[#00ff87]',
    elite: 'bg-yellow-500/20 text-yellow-400',
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow">Platform Control</p>
            <h1 className="text-3xl font-black text-white">Admin Console</h1>
            <p className="mt-1 text-[#a0a0a0]">Users, verifications, content, and subscriptions</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/exercises"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-primary/40"
            >
              Exercises
            </Link>
            <Link
              href="/admin/nutrition"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-primary/40"
            >
              Nutrition
            </Link>
            <Link
              href="/?marketing=1"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10"
            >
              <ArrowLeft className="size-4" />
              Back to site
            </Link>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={`relative flex-shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                active === s.id
                  ? 'bg-primary/[.12] text-primary shadow-[inset_0_0_0_1px_rgba(34,245,154,.15)]'
                  : 'text-[#a0a0a0] hover:bg-white/5 hover:text-white'
              }`}
            >
              {s.label}
              {s.id === 'verifications' && pendingCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="tile skeleton h-28" />
              ))}
            </div>
            <div className="tile overflow-hidden p-0">
              <div className="space-y-0">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 border-b border-white/5 px-4 py-4">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-4 w-20 rounded" />
                    <div className="ml-auto skeleton h-4 w-24 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
          {active === 'overview' && (
            <div className="space-y-6">
              <div>
                <p className="section-eyebrow">Platform Overview</p>
                <h1 className="text-2xl font-black text-white">Dashboard</h1>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'Total Users', value: stats?.totalUsers || 0, icon: '👥', color: '#00ff87' },
                  { label: 'Total Trainers', value: stats?.totalTrainers || 0, icon: '🏋️', color: '#00d4ff' },
                  {
                    label: 'Pending Verifications',
                    value: pendingTileCount,
                    icon: '⏳',
                    color: '#ffd93d',
                  },
                  { label: 'Active Relationships', value: stats?.activeRelationships || 0, icon: '🤝', color: '#ff6b6b' },
                ].map((stat) => (
                  <div key={stat.label} className="tile">
                    <span className="mb-3 text-3xl">{stat.icon}</span>
                    <p className="text-3xl font-black" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-[#a0a0a0]">{stat.label}</p>
                  </div>
                ))}
              </div>
              {pendingTileCount > 0 && (
                <div className="tile border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-yellow-400">⚠ Action Required</p>
                      <p className="mt-1 text-sm text-[#a0a0a0]">
                        {pendingTileCount} pending verification{pendingTileCount !== 1 ? 's' : ''} need your review
                      </p>
                    </div>
                    <button type="button" onClick={() => setActive('verifications')} className="badge-accent cursor-pointer hover:opacity-80">
                      Review now →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === 'users' && (
            <div className="space-y-4">
              <div>
                <p className="section-eyebrow">User Management</p>
                <h1 className="text-2xl font-black text-white">All Users</h1>
              </div>
              <div className="tile overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5">
                    <tr className="text-left text-[#a0a0a0]">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">Plan</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">Joined</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-white/5 transition-colors hover:bg-white/[.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={u.fullName}
                              avatarUrl={u.avatarUrl || u.profileImage}
                              size="sm"
                              rounded="xl"
                            />
                            <div>
                              <p className="font-medium text-white">{u.fullName}</p>
                              <p className="text-xs text-[#a0a0a0]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge-accent text-xs ${ROLE_COLORS[u.role] || ''}`}>{u.role}</span>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span className={`badge-accent text-xs ${PLAN_COLORS[u.subscription?.plan || 'basic'] || ''}`}>
                            {u.subscription?.plan || 'basic'}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-[#a0a0a0] md:table-cell">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`badge-accent text-xs ${u.isSuspended ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
                          >
                            {u.isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => suspendUser(u._id, !u.isSuspended)}
                            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                              u.isSuspended
                                ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                            }`}
                          >
                            {u.isSuspended ? 'Reactivate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-[#a0a0a0]">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active === 'trainers' && (
            <div className="space-y-4">
              <div>
                <p className="section-eyebrow">Trainer Management</p>
                <h1 className="text-2xl font-black text-white">All Trainers</h1>
              </div>
              <div className="tile overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5">
                    <tr className="text-left text-[#a0a0a0]">
                      <th className="px-4 py-3 font-medium">Trainer</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">Specialty</th>
                      <th className="px-4 py-3 font-medium">Gym Verified</th>
                      <th className="px-4 py-3 font-medium">Admin Verified</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainers.map((t) => (
                      <tr key={t._id} className="border-b border-white/5 hover:bg-white/[.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={t.name}
                              avatarUrl={
                                t.profileImage ||
                                (typeof t.userId === 'object' ? t.userId?.avatarUrl || t.userId?.profileImage : undefined)
                              }
                              size="sm"
                              rounded="xl"
                            />
                            <div>
                              <p className="font-medium text-white">{t.name}</p>
                              <p className="text-xs text-[#a0a0a0]">{t.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(t.specialty || []).slice(0, 2).map((s) => (
                              <span key={s} className="badge-accent text-xs">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`badge-accent text-xs ${t.gymVerificationStatus === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}
                          >
                            {t.gymVerificationStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`badge-accent text-xs ${t.adminVerificationStatus === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}
                          >
                            {t.adminVerificationStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {t.adminVerificationStatus !== 'approved' ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => verifyTrainer(t._id, 'verify')}
                                className="rounded-lg border border-[#00ff87]/30 bg-[#00ff87]/20 px-3 py-1.5 text-xs text-[#00ff87] hover:bg-[#00ff87]/30"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => verifyTrainer(t._id, 'reject')}
                                className="rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/30"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#a0a0a0]">✓ Verified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {trainers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-[#a0a0a0]">
                          No trainers found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active === 'gyms' && (
            <div className="space-y-4">
              <div>
                <p className="section-eyebrow">Gym Management</p>
                <h1 className="text-2xl font-black text-white">All Gyms</h1>
              </div>
              <div className="tile overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5">
                    <tr className="text-left text-[#a0a0a0]">
                      <th className="px-4 py-3 font-medium">Gym</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">Owner</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">Country</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gyms.map((g) => (
                      <tr key={g._id} className="border-b border-white/5 hover:bg-white/[.02]">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{g.name}</p>
                          <p className="text-xs text-[#a0a0a0]">{g.address}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-[#a0a0a0] md:table-cell">{g.ownerId?.fullName || '—'}</td>
                        <td className="hidden px-4 py-3 text-xs text-[#a0a0a0] md:table-cell">{g.country}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`badge-accent text-xs ${
                              g.verificationStatus === 'verified'
                                ? 'bg-green-500/20 text-green-400'
                                : g.verificationStatus === 'rejected'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {g.verificationStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {g.verificationStatus !== 'verified' ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => verifyGym(g._id, 'verify')}
                                className="rounded-lg border border-[#00ff87]/30 bg-[#00ff87]/20 px-3 py-1.5 text-xs text-[#00ff87] hover:bg-[#00ff87]/30"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => verifyGym(g._id, 'reject')}
                                className="rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/30"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#a0a0a0]">✓ Verified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {gyms.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-[#a0a0a0]">
                          No gyms found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active === 'verifications' && (
            <div className="space-y-6">
              <div>
                <p className="section-eyebrow">Requires Action</p>
                <h1 className="text-2xl font-black text-white">Pending Verifications</h1>
              </div>
              {pendingTrainers.length > 0 && (
                <div>
                  <h2 className="mb-3 text-lg font-bold text-white">Trainers ({pendingTrainers.length})</h2>
                  <div className="space-y-3">
                    {pendingTrainers.map((t) => (
                      <div key={t._id} className="tile flex-row flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={t.name}
                            avatarUrl={
                              t.profileImage ||
                              (typeof t.userId === 'object' ? t.userId?.avatarUrl || t.userId?.profileImage : undefined)
                            }
                            size="sm"
                            rounded="xl"
                          />
                          <div>
                            <p className="font-bold text-white">{t.name}</p>
                            <p className="text-sm text-[#a0a0a0]">
                              {t.email} · {(t.specialty || []).join(', ')}
                            </p>
                            <p className="mt-1 text-xs text-[#555]">Gym status: {t.gymVerificationStatus}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => verifyTrainer(t._id, 'verify')}
                            className="rounded-xl border border-[#00ff87]/30 bg-[#00ff87]/20 px-4 py-2 text-sm font-medium text-[#00ff87] hover:bg-[#00ff87]/30"
                          >
                            ✓ Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => verifyTrainer(t._id, 'reject')}
                            className="rounded-xl border border-red-500/30 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pendingGyms.length > 0 && (
                <div>
                  <h2 className="mb-3 text-lg font-bold text-white">Gyms ({pendingGyms.length})</h2>
                  <div className="space-y-3">
                    {pendingGyms.map((g) => (
                      <div key={g._id} className="tile flex-row flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-white">{g.name}</p>
                          <p className="text-sm text-[#a0a0a0]">
                            {g.address} · {g.country}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => verifyGym(g._id, 'verify')}
                            className="rounded-xl border border-[#00ff87]/30 bg-[#00ff87]/20 px-4 py-2 text-sm font-medium text-[#00ff87] hover:bg-[#00ff87]/30"
                          >
                            ✓ Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => verifyGym(g._id, 'reject')}
                            className="rounded-xl border border-red-500/30 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pendingCount === 0 && (
                <div className="tile items-center justify-center py-16 text-center">
                  <span className="mb-4 text-4xl">✅</span>
                  <p className="font-bold text-white">All caught up!</p>
                  <p className="mt-1 text-sm text-[#a0a0a0]">No pending verifications</p>
                </div>
              )}
            </div>
          )}

          {active === 'audit' && (
            <div className="space-y-4">
              <div>
                <p className="section-eyebrow">Security</p>
                <h1 className="text-2xl font-black text-white">Audit Logs</h1>
              </div>
              <div className="tile overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5">
                    <tr className="text-left text-[#a0a0a0]">
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">Admin</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">Target</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="border-b border-white/5 hover:bg-white/[.02]">
                        <td className="px-4 py-3">
                          <span className="badge-accent bg-purple-500/20 text-xs text-purple-400">{log.action}</span>
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-[#a0a0a0] md:table-cell">
                          {typeof log.adminId === 'object' ? log.adminId?.fullName : log.adminId}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-[#a0a0a0] md:table-cell">
                          {log.targetModel}{' '}
                          {typeof log.targetId === 'object' && log.targetId?.toString
                            ? log.targetId.toString().slice(-6)
                            : String(log.targetId || '').slice(-6)}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#a0a0a0]">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-[#a0a0a0]">
                          No audit logs yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active === 'subscriptions' && (
            <div className="space-y-4">
              <div>
                <p className="section-eyebrow">Revenue</p>
                <h1 className="text-2xl font-black text-white">Subscriptions</h1>
                <p className="mt-1 text-sm text-[#a0a0a0]">
                  Grant, renew, or revoke plans manually — platform DB only (not synced to Stripe).
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(['basic', 'pro', 'elite'] as const).map((plan) => {
                  const count = subCounts[plan] ?? 0
                  const colors: Record<string, string> = { basic: '#a0a0a0', pro: '#00ff87', elite: '#ffd93d' }
                  return (
                    <div key={plan} className="tile items-center text-center">
                      <p className="text-4xl font-black" style={{ color: colors[plan] }}>
                        {count}
                      </p>
                      <p className="mt-2 font-bold capitalize text-white">{plan}</p>
                      <p className="text-xs text-[#a0a0a0]">effective subscribers</p>
                    </div>
                  )
                })}
              </div>
              <div className="tile overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/5">
                    <tr className="text-left text-[#a0a0a0]">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">End date</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((row) => {
                      const plan = row.subscription?.plan || 'basic'
                      const status = row.subscription?.status === 'inactive' ? 'canceled' : 'active'
                      const endDate = row.subscription?.endDate
                      const busy = subActionId === row._id
                      return (
                        <tr key={row._id} className="border-b border-white/5 hover:bg-white/[.02]">
                          <td className="px-4 py-3">
                            <p className="font-medium text-white">{row.fullName}</p>
                            <p className="text-xs text-[#a0a0a0]">{row.email}</p>
                            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#555]">{row.role}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge-accent text-xs ${PLAN_COLORS[plan] || ''}`}>
                              {plan}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`badge-accent text-xs ${
                                status === 'active'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-[#a0a0a0] md:table-cell">
                            {endDate ? new Date(endDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => manageSubscription(row._id, 'grant', 'pro')}
                                className="rounded-lg border border-[#00ff87]/30 px-2.5 py-1 text-xs text-[#00ff87] hover:bg-[#00ff87]/10 disabled:opacity-50"
                              >
                                Grant Pro
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => manageSubscription(row._id, 'grant', 'elite')}
                                className="rounded-lg border border-yellow-500/30 px-2.5 py-1 text-xs text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50"
                              >
                                Grant Elite
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => manageSubscription(row._id, 'renew')}
                                className="rounded-lg border border-blue-500/30 px-2.5 py-1 text-xs text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
                              >
                                Renew +1mo
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  if (window.confirm(`Revoke ${row.fullName} to Basic?`)) {
                                    manageSubscription(row._id, 'revoke')
                                  }
                                }}
                                className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                              >
                                Revoke
                              </button>
                              <select
                                disabled={busy}
                                defaultValue=""
                                aria-label={`Set plan for ${row.fullName}`}
                                onChange={(e) => {
                                  const value = e.target.value as 'basic' | 'pro' | 'elite' | ''
                                  e.target.value = ''
                                  if (!value) return
                                  if (!window.confirm(`Set ${row.fullName} to ${value}?`)) return
                                  manageSubscription(row._id, 'set', value)
                                }}
                                className="rounded-lg border border-white/10 bg-[#0f0f0f] px-2 py-1 text-xs text-white disabled:opacity-50"
                              >
                                <option value="" disabled>
                                  Set plan…
                                </option>
                                <option value="basic">Basic</option>
                                <option value="pro">Pro</option>
                                <option value="elite">Elite</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {subscriptions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-[#a0a0a0]">
                          No subscribers found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}
