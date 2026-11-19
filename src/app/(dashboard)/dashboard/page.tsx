'use client'
import { PagePhoto } from '@/components/shared/PagePhoto'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/shared/PageLoader'
import { SignInGate } from '@/components/shared/AccessGate'
import { GamificationBar } from '@/components/gamification/GamificationBar'
import type { GamificationMeResponse } from '@/types/gamification'
import type { WorkoutPlan } from '@/types'
import { Apple, BarChart3, Dumbbell, LayoutDashboard, MessageCircle, Users } from 'lucide-react'

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const EMPTY_CALORIES = { calories: 0, protein: 0, carbs: 0, fat: 0 }
type RecentLog = { _id: string; date: string; plan?: { title?: string }; exercises?: Array<{ name: string }> }
async function fetchDashboardData<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) })
  if (!response.ok) throw new Error('Unable to load dashboard data')
  return response.json() as Promise<T>
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const enabled = user?.role === 'user'
  const planQuery = useQuery({ queryKey: ['dashboard', 'plan', user?.id], enabled, queryFn: ({ signal }) => fetchDashboardData<WorkoutPlan | { plan: WorkoutPlan | null } | null>('/api/tracking/plans/my-plan', signal) })
  const mealsQuery = useQuery({ queryKey: ['dashboard', 'meals', user?.id], enabled, queryFn: ({ signal }) => fetchDashboardData<{ totals?: typeof EMPTY_CALORIES }>('/api/tracking/meal-logs/today', signal) })
  const gamificationQuery = useQuery({ queryKey: ['dashboard', 'gamification', user?.id], enabled, queryFn: ({ signal }) => fetchDashboardData<GamificationMeResponse>('/api/gamification/me', signal) })
  const historyQuery = useQuery({ queryKey: ['dashboard', 'history', user?.id], enabled, queryFn: ({ signal }) => fetchDashboardData<{ logs?: RecentLog[] }>('/api/tracking/logs?limit=3', signal) })
  const planData = planQuery.data
  const plan = (planData && 'plan' in planData ? planData.plan : planData) as WorkoutPlan | null | undefined
  const calories = mealsQuery.data?.totals ?? EMPTY_CALORIES
  const gamification = gamificationQuery.data ?? null
  const recentLogs = historyQuery.data?.logs?.slice(0, 3) ?? []
  const queries = [planQuery, mealsQuery, gamificationQuery, historyQuery]

  useEffect(() => {
    if (isLoading) return
    if (!user) return
    if (user.role === 'admin' || user.role === 'super_admin') {
      router.replace('/admin')
      return
    }
    if (user.role === 'trainer') {
      router.replace('/trainer-dashboard')
      return
    }
    if (user.role === 'gym_owner') {
      router.replace('/gym-owner')
    }
  }, [isLoading, user, router])

  if (isLoading) return <PageLoader label="Opening your workspace" />
  if (!user) return <SignInGate redirectLabel="Sign in to open your dashboard" />
  if (user.role !== 'user') return <PageLoader label="Redirecting" />

  const firstName = user.fullName?.split(' ')[0] || 'Athlete'
  const greeting = greetingForHour(new Date().getHours())
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todaySchedule = plan?.weeklySchedule?.find((d) => d.day.toLowerCase() === today.toLowerCase())

  const quickActions = [
    { href: '/my-fitness?tab=nutrition', icon: Apple, label: 'Log Meal' },
    { href: '/coaching', icon: Users, label: 'Find Trainer' },
    { href: '/exercises', icon: Dumbbell, label: 'Browse Exercises' },
    { href: '/community', icon: MessageCircle, label: 'Community' },
  ]

  return (
    <div className="dashboard-fab-reserve-with-nav min-h-screen px-4 pt-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="page-hero fitness-photo-hero px-6 py-6 sm:px-8">
          <PagePhoto kind="progress" />
          <p className="section-eyebrow">Your Home</p>
          <h1 className="text-3xl font-black text-foreground md:text-4xl">
            {greeting}, {firstName}! 💪
          </h1>
          <p className="mt-1 text-muted-foreground">Here&apos;s your fitness snapshot for today</p>
        </div>

        <GamificationBar data={gamification} />
        {queries.some(query => query.isError) && <div role="alert" className="tile"><p className="text-sm text-muted-foreground">Some dashboard data could not be loaded.</p><button type="button" className="mt-2 text-sm font-semibold text-primary" onClick={() => { queries.filter(query => query.isError).forEach(query => { void query.refetch() }) }}>Retry</button></div>}

        <div className="stat-card-grid">
          {[
            { label: "Today's Calories", loading: mealsQuery.isPending, value: `${calories.calories} kcal`, color: '#ff6b6b' },
            { label: 'Active Plan', loading: planQuery.isPending, value: plan?.title || 'None', color: '#00ff87' },
            { label: 'Streak', loading: gamificationQuery.isPending, value: `${gamification?.streak || 0} days`, color: '#ffd93d' },
            { label: 'Level', loading: gamificationQuery.isPending, value: gamification?.level || 1, color: '#00d4ff' },
          ].map((stat) => (
            <div key={stat.label} className="tile">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-2xl font-black truncate" style={{ color: stat.color }}>
                {stat.loading ? '—' : stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="tile min-h-[240px]">
            <p className="section-eyebrow">Training</p>
            <h2 className="mb-4 text-xl font-bold text-foreground">Today&apos;s Workout</h2>
            {planQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !plan ? (
              <div className="flex flex-1 flex-col items-start justify-center gap-3">
                <p className="text-sm text-muted-foreground">No workout plan yet</p>
                  <Link href="/my-trainers" className="btn-accent px-5 py-2 text-sm">
                    Ask my trainers
                </Link>
              </div>
            ) : todaySchedule?.isRestDay ? (
              <p className="text-sm text-muted-foreground">Rest day — recover and recharge</p>
            ) : (
              <ul className="space-y-2">
                {(todaySchedule?.exercises || []).slice(0, 6).map((ex, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-foreground">{ex.name}</span>
                    <span className="text-muted-foreground">
                      {ex.sets}×{ex.reps}
                    </span>
                  </li>
                ))}
                {!todaySchedule?.exercises?.length && (
                  <p className="text-sm text-muted-foreground">No session scheduled for {today}</p>
                )}
                <Link href="/my-fitness?tab=workout" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                  Open full plan →
                </Link>
              </ul>
            )}
          </div>

          <div className="tile min-h-[240px]">
            <p className="section-eyebrow">Fuel</p>
            <h2 className="mb-4 text-xl font-bold text-foreground">Today&apos;s Nutrition</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Calories', value: `${calories.calories}` },
                { label: 'Protein', value: `${Math.round(calories.protein)}g` },
                { label: 'Carbs', value: `${Math.round(calories.carbs)}g` },
                { label: 'Fat', value: `${Math.round(calories.fat)}g` },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-border bg-white/[.02] p-3">
                  <p className="text-lg font-bold text-primary">{mealsQuery.isPending ? '—' : m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
            <Link href="/my-fitness?tab=nutrition" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Log a meal →
            </Link>
          </div>
        </div>

        <div className="tile">
          <p className="section-eyebrow">History</p>
          <h2 className="mb-4 text-xl font-bold text-foreground">Recent Activity</h2>
          {historyQuery.isPending ? <p className="text-sm text-muted-foreground">Loading recent activity...</p> : recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workouts logged yet. Complete a session in My Fitness.</p>
          ) : (
            <ul className="space-y-3">
              {recentLogs.map((log) => (
                <li key={log._id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{log.plan?.title || 'Workout Session'}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.exercises?.map((e) => e.name).slice(0, 3).join(', ') || 'Exercises logged'}
                    </p>
                  </div>
                  <span className="text-xs text-primary">{new Date(log.date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <Link key={a.href} href={a.href} className="tile interactive-lift min-h-0 items-center py-5 text-center">
                <Icon className="mb-2 size-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{a.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/my-fitness" className="btn-accent inline-flex items-center gap-2 px-5 py-2.5 text-sm">
            <LayoutDashboard className="size-4" /> My Fitness
          </Link>
          <Link href="/analytics" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:border-primary/40">
            <BarChart3 className="size-4 text-primary" /> Analytics
          </Link>
        </div>
      </div>
    </div>
  )
}
