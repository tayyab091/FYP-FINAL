import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { recordFormCheckSession } from '@/lib/gamification'
import { normalizePlan, canUseExerciseCheck } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import { formCheckSchema, parseJsonBody } from '@/lib/validation'
import { rateLimitAi } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAi(req)
    if (limited) return limited

    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const parsed = await parseJsonBody(req, formCheckSchema)
    if ('error' in parsed) return parsed.error
    const { exercise, reps } = parsed.data

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
