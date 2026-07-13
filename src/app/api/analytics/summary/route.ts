import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import {
  syncUserSubscription,
  normalizePlan,
  canAccessAnalytics,
} from '@/lib/subscription'
import WorkoutLog from '@/models/WorkoutLog'
import MealLog from '@/models/MealLog'
import ProgressRecord from '@/models/ProgressRecord'

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDayKey(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10)
}

function weekKey(date: Date | string) {
  const d = new Date(date)
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - day + 1)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    if (!bypassesSubscriptionGate(tokenUser.role)) {
      const subscription = await syncUserSubscription(tokenUser.userId)
      if (!canAccessAnalytics(normalizePlan(subscription?.plan))) {
        return NextResponse.json(
          { message: 'Advanced analytics require Pro or Elite' },
          { status: 403 },
        )
      }
    }

    await connectDB()
    const since = startOfDay(new Date())
    since.setDate(since.getDate() - 29)

    const [workouts, meals, progress] = await Promise.all([
      WorkoutLog.find({
        userId: tokenUser.userId,
        status: 'completed',
        date: { $gte: since },
      }).select('date').lean(),
      MealLog.find({
        userId: tokenUser.userId,
        date: { $gte: since },
      }).select('date totalCalories').lean(),
      ProgressRecord.find({
        userId: tokenUser.userId,
        date: { $gte: since },
        weight: { $exists: true, $ne: null },
      }).select('date weight').sort({ date: 1 }).lean(),
    ])

    const workoutCount = workouts.length

    const daySet = new Set(workouts.map((w) => toDayKey(w.date)))
    let streak = 0
    const cursor = startOfDay(new Date())
    while (daySet.has(toDayKey(cursor))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    const caloriesByDay = new Map<string, number>()
    for (const meal of meals) {
      const key = toDayKey(meal.date)
      caloriesByDay.set(key, (caloriesByDay.get(key) || 0) + (meal.totalCalories || 0))
    }
    const calorieDays = [...caloriesByDay.values()]
    const avgDailyCalories = calorieDays.length
      ? Math.round(calorieDays.reduce((a, b) => a + b, 0) / calorieDays.length)
      : 0

    const dailyCalories = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(since)
      d.setDate(since.getDate() + i)
      const key = toDayKey(d)
      return {
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calories: caloriesByDay.get(key) || 0,
      }
    })

    const workoutsByWeek = new Map<string, number>()
    for (const w of workouts) {
      const key = weekKey(w.date)
      workoutsByWeek.set(key, (workoutsByWeek.get(key) || 0) + 1)
    }
    const weeklyWorkouts = [...workoutsByWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({
        week,
        label: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        workouts: count,
      }))

    const weightTrend = progress
      .filter((p) => typeof p.weight === 'number')
      .map((p) => ({
        date: toDayKey(p.date),
        label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: p.weight as number,
      }))

    const firstWeight = weightTrend[0]?.weight
    const lastWeight = weightTrend[weightTrend.length - 1]?.weight
    const weightChange = firstWeight != null && lastWeight != null
      ? Math.round((lastWeight - firstWeight) * 10) / 10
      : null

    // Simple correlation: weeks with above-median workouts vs weight change across those weeks
    let correlationInsight =
      'Log workouts and weight regularly for clearer training–bodyweight correlations.'

    if (weeklyWorkouts.length >= 2 && weightTrend.length >= 2 && firstWeight != null && lastWeight != null) {
      const medianWorkouts = [...weeklyWorkouts.map((w) => w.workouts)].sort((a, b) => a - b)[
        Math.floor(weeklyWorkouts.length / 2)
      ]
      const highWeeks = weeklyWorkouts.filter((w) => w.workouts >= medianWorkouts).length
      const lowWeeks = weeklyWorkouts.length - highWeeks
      const direction = weightChange! < 0 ? 'down' : weightChange! > 0 ? 'up' : 'stable'

      if (workoutCount >= 4 && highWeeks > lowWeeks) {
        correlationInsight = `Weeks with more workouts (${highWeeks} of ${weeklyWorkouts.length}) aligned with weight trending ${direction} (${weightChange! > 0 ? '+' : ''}${weightChange} kg over 30 days).`
      } else if (workoutCount >= 4) {
        correlationInsight = `Workout volume was uneven across weeks; weight moved ${direction} by ${weightChange! > 0 ? '+' : ''}${weightChange} kg. Consistency may tighten the signal.`
      } else {
        correlationInsight = `Only ${workoutCount} workouts logged in 30 days — add more sessions to compare high-volume weeks with weight change.`
      }
    } else if (workoutCount > 0 && weightTrend.length < 2) {
      correlationInsight = `You completed ${workoutCount} workouts in 30 days. Log weight at least twice to estimate training vs bodyweight correlation.`
    }

    return NextResponse.json({
      periodDays: 30,
      summary: {
        workoutCount,
        streak,
        avgDailyCalories,
        weightChange,
        latestWeight: lastWeight ?? null,
      },
      charts: {
        weightTrend,
        weeklyWorkouts,
        dailyCalories,
      },
      correlationInsight,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
