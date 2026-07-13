'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { BarChart3, Flame, Scale, Utensils, Dumbbell } from 'lucide-react'
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
} from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { canAccessAnalyticsForUser } from '@/lib/access'
import { chartTheme } from '@/lib/chart-theme'
import { PageLoader } from '@/components/shared/PageLoader'
import { AccessGate, SignInGate } from '@/components/shared/AccessGate'
import { FadeIn, StaggerChildren, CountUp } from '@/components/motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface AnalyticsSummary {
  periodDays: number
  summary: {
    workoutCount: number
    streak: number
    avgDailyCalories: number
    weightChange: number | null
    latestWeight: number | null
  }
  charts: {
    weightTrend: Array<{ date: string; label: string; weight: number }>
    weeklyWorkouts: Array<{ week: string; label: string; workouts: number }>
    dailyCalories: Array<{ date: string; label: string; calories: number }>
  }
  correlationInsight: string
}

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/analytics/summary')
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to load analytics')
      setData(json)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analytics failed')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && canAccessAnalyticsForUser(user)) loadSummary()
  }, [user, loadSummary])

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in for analytics" />

  if (!canAccessAnalyticsForUser(user)) {
    return (
      <AccessGate
        icon={BarChart3}
        title="Pro feature"
        description="Advanced analytics are available on Pro and Elite. Upgrade to unlock 30-day workout, nutrition, and weight insights."
        action={<Link href="/subscription" className="btn-accent px-8 py-3 text-sm">Upgrade plan</Link>}
      />
    )
  }

  const summary = data?.summary

  return (
    <div className="min-h-screen pt-6 pb-28 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <div className="page-hero mb-6 px-6 py-8 sm:px-8 gym-floor">
            <p className="eyebrow mb-2">Performance Intel</p>
            <h1 className="display-title text-3xl md:text-4xl">Advanced Analytics</h1>
            <p className="mt-2 text-muted-foreground">
              Last 30 days of training volume, nutrition averages, and weight trend.
            </p>
          </div>
        </FadeIn>

        {loading || !data ? (
          <Skeleton className="h-48 bg-muted" />
        ) : (
          <>
            <StaggerChildren className="dashboard-grid cols-4 mb-6">
              <Card className="card-athletic interactive-lift">
                <CardHeader>
                  <CardTitle className="workout-label flex items-center gap-2 text-muted-foreground">
                    <Dumbbell className="size-3.5" /> Workouts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-primary">
                    <CountUp value={summary?.workoutCount || 0} />
                  </div>
                </CardContent>
              </Card>
              <Card className="card-athletic interactive-lift">
                <CardHeader>
                  <CardTitle className="workout-label flex items-center gap-2 text-muted-foreground">
                    <Flame className="size-3.5" /> Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-primary">
                    <CountUp value={summary?.streak || 0} />
                    <span className="ml-1 text-sm font-medium text-muted-foreground">days</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-athletic interactive-lift">
                <CardHeader>
                  <CardTitle className="workout-label flex items-center gap-2 text-muted-foreground">
                    <Utensils className="size-3.5" /> Avg calories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-primary">
                    <CountUp value={summary?.avgDailyCalories || 0} />
                  </div>
                </CardContent>
              </Card>
              <Card className="card-athletic interactive-lift">
                <CardHeader>
                  <CardTitle className="workout-label flex items-center gap-2 text-muted-foreground">
                    <Scale className="size-3.5" /> Weight Δ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-primary">
                    {summary?.weightChange == null
                      ? '—'
                      : `${summary.weightChange > 0 ? '+' : ''}${summary.weightChange} kg`}
                  </div>
                  {summary?.latestWeight != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Latest {summary.latestWeight} kg
                    </p>
                  )}
                </CardContent>
              </Card>
            </StaggerChildren>

            <Card className="elite-panel mb-6 border-white/[.08]">
              <CardContent className="py-5 text-sm leading-relaxed text-[#c8d0cb]">
                {data.correlationInsight}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="elite-panel border-white/[.08]">
                <CardHeader>
                  <CardTitle className="text-base">Weight trend</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  {data.charts.weightTrend.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No weight logs in the last 30 days.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.charts.weightTrend}>
                        <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke={chartTheme.axis} tick={{ fontSize: 11 }} />
                        <YAxis stroke={chartTheme.axis} tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={chartTheme.tooltip}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke={chartTheme.primary}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: chartTheme.primary }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="elite-panel border-white/[.08]">
                <CardHeader>
                  <CardTitle className="text-base">Weekly workouts</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  {data.charts.weeklyWorkouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No completed workouts yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.charts.weeklyWorkouts}>
                        <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke={chartTheme.axis} tick={{ fontSize: 11 }} />
                        <YAxis stroke={chartTheme.axis} tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip contentStyle={chartTheme.tooltip} labelStyle={{ color: '#fff' }} />
                        <Bar dataKey="workouts" fill={chartTheme.primary} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="elite-panel border-white/[.08] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Daily calories</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.charts.dailyCalories}>
                      <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        stroke={chartTheme.axis}
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis stroke={chartTheme.axis} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={chartTheme.tooltip} labelStyle={{ color: '#fff' }} />
                      <Bar dataKey="calories" fill={chartTheme.secondary} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
