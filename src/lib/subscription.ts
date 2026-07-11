import User from '@/models/User'
import type { PlanId } from '@/lib/plans'

export interface ResolvedSubscription {
  plan: PlanId
  status: 'active' | 'inactive'
  startDate?: Date
  endDate?: Date
}

export const PLAN_LIMITS = {
  basic: {
    maxTrainerConnections: 5,
    workoutsPerWeek: 3,
    exerciseCheck: false,
  },
  pro: {
    maxTrainerConnections: Infinity,
    workoutsPerWeek: Infinity,
    exerciseCheck: true,
  },
  elite: {
    maxTrainerConnections: Infinity,
    workoutsPerWeek: Infinity,
    exerciseCheck: true,
  },
} as const

export function normalizePlan(plan?: string): PlanId {
  if (plan === 'pro' || plan === 'elite') return plan
  return 'basic'
}

export function resolveSubscriptionFromUser(user: {
  subscription?: {
    plan?: string
    status?: string
    startDate?: Date
    endDate?: Date
  }
}): ResolvedSubscription {
  const plan = normalizePlan(user.subscription?.plan)
  const endDate = user.subscription?.endDate ? new Date(user.subscription.endDate) : undefined

  if (plan !== 'basic' && endDate && endDate < new Date()) {
    return { plan: 'basic', status: 'active' }
  }

  return {
    plan,
    status: user.subscription?.status === 'inactive' ? 'inactive' : 'active',
    startDate: user.subscription?.startDate,
    endDate,
  }
}

/** Downgrade expired paid plans in the database and return the effective subscription. */
export async function syncUserSubscription(userId: string): Promise<ResolvedSubscription | null> {
  const user = await User.findById(userId).select('subscription').lean()
  if (!user) return null

  const resolved = resolveSubscriptionFromUser(user)
  const storedPlan = normalizePlan(user.subscription?.plan)
  const endDate = user.subscription?.endDate ? new Date(user.subscription.endDate) : undefined

  if (storedPlan !== 'basic' && endDate && endDate < new Date()) {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          subscription: {
            plan: 'basic',
            status: 'active',
            startDate: user.subscription?.startDate,
            endDate: undefined,
          },
        },
      },
    )
  }

  return resolved
}

export function canUseExerciseCheck(plan: PlanId): boolean {
  return PLAN_LIMITS[plan].exerciseCheck
}

export function getWorkoutWeeklyLimit(plan: PlanId): number {
  return PLAN_LIMITS[plan].workoutsPerWeek
}

export function getTrainerConnectionLimit(plan: PlanId): number {
  return PLAN_LIMITS[plan].maxTrainerConnections
}
