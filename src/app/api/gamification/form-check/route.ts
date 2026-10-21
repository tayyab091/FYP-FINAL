import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
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

    const parsed = await parseJsonBody(req, formCheckSchema)
    if ('error' in parsed) return parsed.error
    const { exercise, reps } = parsed.data

    await connectDB()

    // Same gating pattern as /api/analytics/summary: privileged roles
    // (admin/super_admin/trainer/gym_owner) bypass the plan check entirely —
    // matching the client-side `ExerciseCheckGate` / `canAccessExerciseCheck`
    // behavior so a privileged user is never allowed by the UI but then
    // rejected by the API (previously this route hard-required
    // `role === 'user'`, which disagreed with the client gate).
    if (!bypassesSubscriptionGate(tokenUser.role)) {
      const subscription = await syncUserSubscription(tokenUser.userId)
      const plan = normalizePlan(subscription?.plan)
      if (!canUseExerciseCheck(plan)) {
        return NextResponse.json(
          { message: 'AI form checking requires Pro or Elite plan' },
          { status: 403 },
        )
      }
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
