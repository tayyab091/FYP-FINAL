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
