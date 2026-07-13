import {
  canAccessAnalytics as planCanAccessAnalytics,
  canAccessCommunity as planCanAccessCommunity,
  canAccessMealPlans as planCanAccessMealPlans,
  canUseExerciseCheck,
  normalizePlan,
} from '@/lib/subscription'

export type UserRole = 'user' | 'trainer' | 'gym_owner' | 'admin' | 'super_admin'

const PRIVILEGED_ROLES: UserRole[] = ['admin', 'super_admin', 'trainer', 'gym_owner']

export function bypassesSubscriptionGate(role?: string): boolean {
  return PRIVILEGED_ROLES.includes(role as UserRole)
}

export function getRoleHomePath(role?: string): string {
  switch (role) {
    case 'trainer':
      return '/trainer-dashboard'
    case 'gym_owner':
      return '/gym-owner'
    case 'admin':
    case 'super_admin':
      return '/admin'
    case 'user':
      return '/'
    default:
      return '/my-fitness'
  }
}

export function canAccessExerciseCheck(
  user: { role?: string; subscription?: { plan?: string } } | null,
): boolean {
  if (!user) return false
  if (bypassesSubscriptionGate(user.role)) return true
  return canUseExerciseCheck(normalizePlan(user.subscription?.plan))
}

export function canAccessMealPlansForUser(
  user: { role?: string; subscription?: { plan?: string } } | null,
): boolean {
  if (!user) return false
  if (bypassesSubscriptionGate(user.role)) return true
  return planCanAccessMealPlans(normalizePlan(user.subscription?.plan))
}

export function canAccessAnalyticsForUser(
  user: { role?: string; subscription?: { plan?: string } } | null,
): boolean {
  if (!user) return false
  if (bypassesSubscriptionGate(user.role)) return true
  return planCanAccessAnalytics(normalizePlan(user.subscription?.plan))
}

export function canAccessCommunityForUser(
  user: { role?: string; subscription?: { plan?: string; status?: string } } | null,
): boolean {
  if (!user) return false
  if (bypassesSubscriptionGate(user.role)) return true
  if (user.subscription?.status === 'inactive') return false
  return planCanAccessCommunity(normalizePlan(user.subscription?.plan))
}
