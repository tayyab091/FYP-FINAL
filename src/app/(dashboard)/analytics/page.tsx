'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { canAccessAnalyticsForUser } from '@/lib/access'
import { PageLoader } from '@/components/shared/PageLoader'
import { AccessGate, SignInGate } from '@/components/shared/AccessGate'
import { BackButton } from '@/components/shared/BackButton'
import { BarChart3 } from 'lucide-react'

interface AnalyticsPayload {
  summary?: {
    workoutCount?: number
    streak?: number
    avgDailyCalories?: number
  }
  charts?: {
    weightTrend?: Array<{ label: string; weight: number }>
    weeklyWorkouts?: Array<{ label: string; week?: string; workouts: number }>
  }
  totalWorkouts?: number
  avgCalories?: number
  streak?: number
  totalXP?: number
  avgProtein?: number
  avgCarbs?: number
  avgFat?: number
  longestStreak?: number
  maxCaloriesBurned?: number
  monthlyWorkouts?: number
  totalMealsLogged?: number
  weeklyWorkouts?: Array<{ day: string; workouts: number }>
}

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [summary, setSummary] = useState<AnalyticsPayload | null>(null)
  const [progress, setProgress] = useState<Array<{ date: string; weight?: number }>>([])
  const [mealToday, setMealToday] = useState<{ totals?: { protein?: number; carbs?: number; fat?: number } } | null>(null)
  const [gamification, setGamification] = useState<{ xp?: number; streak?: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !canAccessAnalyticsForUser(user)) {
      setLoading(false)
      return
    }

    const controllers = [new AbortController(), new AbortController(), new AbortController(), new AbortController()]
    const timers = controllers.map((c) => setTimeout(() => c.abort(), 8000))

    Promise.all([
      fetch('/api/analytics/summary', { signal: controllers[0].signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/tracking/progress', { signal: controllers[1].signal }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/tracking/meal-logs/today', { signal: controllers[2].signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/gamification/me', { signal: controllers[3].signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([sum, prog, meals, game]) => {
        setSummary(sum)
        setProgress(Array.isArray(prog) ? prog : [])
        setMealToday(meals)
        setGamification(game)
      })
      .finally(() => {
        setLoading(false)
        timers.forEach(clearTimeout)
      })

    return () => controllers.forEach((c) => c.abort())
  }, [user])

  const MACRO_COLORS = ['#00ff87', '#00d4ff', '#ff6b6b', '#ffd93d']

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in for analytics" />
  if (!canAccessAnalyticsForUser(user)) {
    return (
      <AccessGate
        icon={BarChart3}
        title="Pro feature"
        description="Advanced analytics are available on Pro and Elite. Upgrade to unlock 30-day workout, nutrition, and weight insights."
        action={
          <Link href="/subscription" className="btn-accent px-8 py-3 text-sm">
            Upgrade plan
          </Link>
        }
      />
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="tile skeleton h-40" />
        ))}
      </div>
    )
  }

  const totalWorkouts = summary?.summary?.workoutCount ?? summary?.totalWorkouts ?? 0
  const avgCalories = summary?.summary?.avgDailyCalories ?? summary?.avgCalories ?? 0
  const streak = summary?.summary?.streak ?? gamification?.streak ?? summary?.streak ?? 0
  const totalXP = summary?.totalXP ?? gamification?.xp ?? 0

  const macroData = [
    { name: 'Protein', value: summary?.avgProtein ?? mealToday?.totals?.protein ?? 0 },
    { name: 'Carbs', value: summary?.avgCarbs ?? mealToday?.totals?.carbs ?? 0 },
    { name: 'Fat', value: summary?.avgFat ?? mealToday?.totals?.fat ?? 0 },
  ].map((m) => ({ ...m, value: Math.round(Number(m.value) || 0) }))

  const weightData =
    summary?.charts?.weightTrend?.map((p) => ({ date: p.label, weight: p.weight })) ||
    progress
      .filter((p) => typeof p.weight === 'number')
      .map((p) => ({
        date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: p.weight as number,
      }))

  const workoutData =
    summary?.charts?.weeklyWorkouts?.map((w) => ({ day: w.label, workouts: w.workouts })) ||
    summary?.weeklyWorkouts || [
      { day: 'Mon', workouts: 0 },
      { day: 'Tue', workouts: 0 },
      { day: 'Wed', workouts: 0 },
      { day: 'Thu', workouts: 0 },
      { day: 'Fri', workouts: 0 },
      { day: 'Sat', workouts: 0 },
      { day: 'Sun', workouts: 0 },
    ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28">
      <BackButton />
      <div className="mb-8">
        <p className="section-eyebrow">Your Performance</p>
        <h1 className="text-3xl font-black text-foreground">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Track every metric of your fitness journey</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Workouts', value: totalWorkouts, icon: '🏋️', color: '#00ff87' },
          { label: 'Avg Daily Calories', value: `${avgCalories} kcal`, icon: '🔥', color: '#ff6b6b' },
          { label: 'Current Streak', value: `${streak} days`, icon: '⚡', color: '#ffd93d' },
          { label: 'Total XP Earned', value: totalXP, icon: '🏆', color: '#00d4ff' },
        ].map((stat) => (
          <div key={stat.label} className="tile">
            <span className="mb-3 text-2xl">{stat.icon}</span>
            <p className="text-2xl font-black" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="tile min-h-[280px]">
          <p className="section-eyebrow">Body Weight</p>
          <h3 className="mb-4 font-bold text-foreground">Weight Progress</h3>
          {weightData.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#a0a0a0', fontSize: 11 }} />
                <YAxis tick={{ fill: '#a0a0a0', fontSize: 11 }} unit="kg" />
                <Tooltip
                  contentStyle={{
                    background: '#0e1a14',
                    border: '1px solid rgba(0,255,135,0.2)',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                />
                <Line type="monotone" dataKey="weight" stroke="#00ff87" strokeWidth={2.5} dot={{ fill: '#00ff87', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Log your weight in My Fitness to see your progress chart
            </div>
          )}
        </div>

        <div className="tile min-h-[280px]">
          <p className="section-eyebrow">Training Volume</p>
          <h3 className="mb-4 font-bold text-foreground">This Week&apos;s Workouts</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={workoutData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#a0a0a0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#a0a0a0', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: '#0e1a14',
                  border: '1px solid rgba(0,255,135,0.2)',
                  borderRadius: 12,
                  color: '#fff',
                }}
              />
              <Bar dataKey="workouts" fill="#00ff87" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="tile min-h-[240px]">
          <p className="section-eyebrow">Nutrition</p>
          <h3 className="mb-4 font-bold text-foreground">Average Macro Split</h3>
          {macroData.some((m) => m.value > 0) ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={macroData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {macroData.map((_, i) => (
                      <Cell key={i} fill={MACRO_COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {macroData.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: MACRO_COLORS[i] }} />
                    <span className="text-sm text-muted-foreground">{m.name}</span>
                    <span className="ml-auto text-sm font-bold text-foreground">{m.value}g</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Log meals to see your macro breakdown
            </div>
          )}
        </div>

        <div className="tile min-h-[240px]">
          <p className="section-eyebrow">Achievements</p>
          <h3 className="mb-4 font-bold text-foreground">Personal Bests</h3>
          <div className="space-y-3">
            {[
              { label: 'Longest Streak', value: `${summary?.longestStreak ?? streak} days`, icon: '🔥' },
              { label: 'Most Calories Burned', value: `${summary?.maxCaloriesBurned || 0} kcal`, icon: '💪' },
              { label: 'Workouts This Month', value: summary?.monthlyWorkouts ?? totalWorkouts, icon: '📅' },
              { label: 'Meals Logged', value: summary?.totalMealsLogged || 0, icon: '🥗' },
            ].map((pb) => (
              <div key={pb.label} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div className="flex items-center gap-3">
                  <span>{pb.icon}</span>
                  <span className="text-sm text-muted-foreground">{pb.label}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{pb.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
