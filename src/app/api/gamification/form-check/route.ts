import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { recordFormCheckSession } from '@/lib/gamification'
import { normalizePlan, canUseExerciseCheck } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const body = await req.json() as { exercise?: unknown; reps?: unknown }
    const exercise = typeof body.exercise === 'string' ? body.exercise.trim() : ''
    const reps = typeof body.reps === 'number' ? body.reps : Number(body.reps)

    if (!exercise) {
      return NextResponse.json({ message: 'Exercise name required' }, { status: 400 })
    }
    if (!Number.isFinite(reps) || reps < 1) {
      return NextResponse.json({ message: 'At least one rep required' }, { status: 400 })
    }

    await connectDB()
    const subscription = await syncUserSubscription(tokenUser.userId)
    const plan = normalizePlan(subscription?.plan)
    if (!canUseExerciseCheck(plan)) {
      return NextResponse.json(
        { message: 'AI form checking requires Pro or Elite plan' },
        { status: 403 },
      )
    }

    const result = await recordFormCheckSession(tokenUser.userId, reps)
    return NextResponse.json({
      message: 'Form check session recorded',
      exercise,
      reps,
      xpAwarded: result.xpAwarded,
      gamification: result.gamification,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
