'use client'

import { useEffect, useState } from 'react'
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

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [calories, setCalories] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [gamification, setGamification] = useState<GamificationMeResponse | null>(null)
  const [recentLogs, setRecentLogs] = useState<Array<{ _id: string; date: string; plan?: { title?: string }; exercises?: Array<{ name: string }> }>>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    if (!user || user.role !== 'user') return
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    Promise.all([
      fetch('/api/tracking/plans/my-plan', { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/tracking/meal-logs/today', { signal: controller.signal }).then((r) =>
        r.ok ? r.json() : { totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      ),
      fetch('/api/gamification/me', { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/tracking/logs?limit=3', { signal: controller.signal }).then((r) => (r.ok ? r.json() : { logs: [] })),
    ])
      .then(([planData, mealData, gamificationData, historyData]) => {
        if (planData?.plan === null) setPlan(null)
        else if (planData?._id) setPlan(planData)
        else if (planData?.plan) setPlan(planData.plan)
        setCalories(mealData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 })
        if (gamificationData?.xp !== undefined) setGamification(gamificationData)
        setRecentLogs(Array.isArray(historyData?.logs) ? historyData.logs.slice(0, 3) : [])
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout)
        setLoading(false)
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [user])

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
        <div>
          <p className="section-eyebrow">Your Home</p>
          <h1 className="text-3xl font-black text-white md:text-4xl">
            {greeting}, {firstName}! 💪
          </h1>
          <p className="mt-1 text-[#a0a0a0]">Here&apos;s your fitness snapshot for today</p>
        </div>

        <GamificationBar data={gamification} />

        <div className="stat-card-grid">
          {[
            { label: "Today's Calories", value: `${calories.calories} kcal`, color: '#ff6b6b' },
            { label: 'Active Plan', value: plan?.title || 'None', color: '#00ff87' },
            { label: 'Streak', value: `${gamification?.streak || 0} days`, color: '#ffd93d' },
            { label: 'Level', value: gamification?.level || 1, color: '#00d4ff' },
          ].map((stat) => (
            <div key={stat.label} className="tile">
              <p className="text-xs uppercase tracking-wider text-[#a0a0a0]">{stat.label}</p>
              <p className="mt-2 text-2xl font-black truncate" style={{ color: stat.color }}>
                {loading ? '—' : stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="tile min-h-[240px]">
            <p className="section-eyebrow">Training</p>
            <h2 className="mb-4 text-xl font-bold text-white">Today&apos;s Workout</h2>
            {loading ? (
              <p className="text-sm text-[#a0a0a0]">Loading...</p>
            ) : !plan ? (
              <div className="flex flex-1 flex-col items-start justify-center gap-3">
                <p className="text-sm text-[#a0a0a0]">No workout plan yet</p>
                <Link href="/coaching" className="btn-accent px-5 py-2 text-sm">
                  Find a Trainer
                </Link>
              </div>
            ) : todaySchedule?.isRestDay ? (
              <p className="text-sm text-[#a0a0a0]">Rest day — recover and recharge</p>
            ) : (
              <ul className="space-y-2">
                {(todaySchedule?.exercises || []).slice(0, 6).map((ex, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-white">{ex.name}</span>
                    <span className="text-[#a0a0a0]">
                      {ex.sets}×{ex.reps}
                    </span>
                  </li>
                ))}
                {!todaySchedule?.exercises?.length && (
                  <p className="text-sm text-[#a0a0a0]">No session scheduled for {today}</p>
                )}
                <Link href="/my-fitness?tab=workout" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                  Open full plan →
                </Link>
              </ul>
            )}
          </div>

          <div className="tile min-h-[240px]">
            <p className="section-eyebrow">Fuel</p>
            <h2 className="mb-4 text-xl font-bold text-white">Today&apos;s Nutrition</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Calories', value: `${calories.calories}` },
                { label: 'Protein', value: `${Math.round(calories.protein)}g` },
                { label: 'Carbs', value: `${Math.round(calories.carbs)}g` },
                { label: 'Fat', value: `${Math.round(calories.fat)}g` },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-white/5 bg-white/[.02] p-3">
                  <p className="text-lg font-bold text-primary">{m.value}</p>
                  <p className="text-xs text-[#a0a0a0]">{m.label}</p>
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
          <h2 className="mb-4 text-xl font-bold text-white">Recent Activity</h2>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-[#a0a0a0]">No workouts logged yet. Complete a session in My Fitness.</p>
          ) : (
            <ul className="space-y-3">
              {recentLogs.map((log) => (
                <li key={log._id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                  <div>
                    <p className="font-medium text-white">{log.plan?.title || 'Workout Session'}</p>
                    <p className="text-xs text-[#a0a0a0]">
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
                <span className="text-sm font-medium text-white">{a.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/my-fitness" className="btn-accent inline-flex items-center gap-2 px-5 py-2.5 text-sm">
            <LayoutDashboard className="size-4" /> My Fitness
          </Link>
          <Link href="/analytics" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm text-white hover:border-primary/40">
            <BarChart3 className="size-4 text-primary" /> Analytics
          </Link>
        </div>
      </div>
    </div>
  )
}
