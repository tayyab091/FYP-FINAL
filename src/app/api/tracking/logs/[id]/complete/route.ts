import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import WorkoutPlan from '@/models/WorkoutPlan'
import WorkoutLog from '@/models/WorkoutLog'
import { getWorkoutWeeklyLimit, normalizePlan } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import { awardWorkoutXp } from '@/lib/gamification'
import { parseJsonBody, parseObjectIdParam, workoutCompleteSchema } from '@/lib/validation'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'plan id')
    if ('error' in idResult) return idResult.error

    const parsed = await parseJsonBody(req, workoutCompleteSchema)
    if ('error' in parsed) return parsed.error

    await connectDB()
    const plan = await WorkoutPlan.findOne({
      _id: idResult.id,
      userId: tokenUser.userId,
      status: 'active',
    }).select('_id')
    if (!plan) {
      return NextResponse.json({ message: 'Active plan not found' }, { status: 404 })
    }

    const subscription = await syncUserSubscription(tokenUser.userId)
    const planId = normalizePlan(subscription?.plan)
    const weeklyLimit = getWorkoutWeeklyLimit(planId)
    if (Number.isFinite(weeklyLimit)) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const completedThisWeek = await WorkoutLog.countDocuments({
        userId: tokenUser.userId,
        status: 'completed',
        date: { $gte: weekStart },
      })
      if (completedThisWeek >= weeklyLimit) {
        return NextResponse.json(
          { message: 'Basic plan allows 3 workouts per week. Upgrade to Pro for unlimited workouts.' },
          { status: 403 },
        )
      }
    }

    const log = await WorkoutLog.create({
      userId: tokenUser.userId,
      planId: plan._id,
      status: 'completed',
      exercises: parsed.data.exercises,
      durationMinutes: parsed.data.durationMinutes || 0,
      notes: parsed.data.notes || '',
      date: new Date(),
    })

    const gamificationResult = await awardWorkoutXp(tokenUser.userId)

    return NextResponse.json(
      {
        message: 'Workout completed',
        log,
        xpAwarded: gamificationResult.xpAwarded,
        streakBonus: gamificationResult.streakBonus,
        newlyUnlocked: gamificationResult.newlyUnlocked,
        gamification: gamificationResult.gamification,
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
