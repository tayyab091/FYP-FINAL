import User from '@/models/User'
import type { PlanId } from '@/lib/plans'
import { createNotification } from '@/lib/notifications'

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
    mealPlans: false,
    analytics: false,
    community: true,
    liveSessions: false,
  },
  pro: {
    maxTrainerConnections: Infinity,
    workoutsPerWeek: Infinity,
    exerciseCheck: true,
    mealPlans: true,
    analytics: true,
    community: true,
    liveSessions: false,
  },
  elite: {
    maxTrainerConnections: Infinity,
    workoutsPerWeek: Infinity,
    exerciseCheck: true,
    mealPlans: true,
    analytics: true,
    community: true,
    liveSessions: true,
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

export function canAccessMealPlans(plan: PlanId): boolean {
  return PLAN_LIMITS[plan].mealPlans
}

export function canAccessAnalytics(plan: PlanId): boolean {
  return PLAN_LIMITS[plan].analytics
}

export function canAccessCommunity(plan: PlanId): boolean {
  return PLAN_LIMITS[plan].community
}

export function canAccessLiveSessions(plan: PlanId): boolean {
  return PLAN_LIMITS[plan].liveSessions
}

export function getWorkoutWeeklyLimit(plan: PlanId): number {
  return PLAN_LIMITS[plan].workoutsPerWeek
}

export function getTrainerConnectionLimit(plan: PlanId): number {
  return PLAN_LIMITS[plan].maxTrainerConnections
}

/** Activate a paid plan. Safe to call from webhook and confirm — skips if already active. */
export async function activateUserPlan(userId: string, plan: 'pro' | 'elite') {
  const existing = await User.findById(userId).select('subscription')
  if (!existing) return null

  const currentEnd = existing.subscription?.endDate
    ? new Date(existing.subscription.endDate)
    : undefined
  const alreadyActive =
    existing.subscription?.plan === plan &&
    existing.subscription?.status === 'active' &&
    !!currentEnd &&
    currentEnd > new Date()

  if (alreadyActive) {
    return User.findById(userId).select('-password')
  }

  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + 1)

  const user = await User.findByIdAndUpdate(
    userId,
    {
      subscription: {
        plan,
        status: 'active',
        startDate,
        endDate,
      },
    },
    { new: true, runValidators: true },
  ).select('-password')

  if (user) {
    const planLabel = plan === 'pro' ? 'Pro' : 'Elite'
    await createNotification({
      userId,
      title: `${planLabel} plan activated`,
      message: `Your ${planLabel} plan is active`,
      type: 'payment',
      link: '/subscription',
    })
  }

  return user
}
