import {
  canAccessAnalytics as planCanAccessAnalytics,
  canAccessCommunity as planCanAccessCommunity,
  canAccessMealPlans as planCanAccessMealPlans,
  canUseExerciseCheck,
  normalizePlan,
} from '@/lib/subscription'

export type UserRole = 'user' | 'trainer' | 'gym_owner' | 'admin' | 'super_admin'

const PRIVILEGED_ROLES: UserRole[] = ['admin', 'super_admin', 'trainer', 'gym_owner']

const ADMIN_CONSOLE_ROLES: UserRole[] = ['admin', 'super_admin']

export function isAdminConsoleRole(role?: string): role is 'admin' | 'super_admin' {
  return ADMIN_CONSOLE_ROLES.includes(role as UserRole)
}

export function isSuperAdmin(role?: string): role is 'super_admin' {
  return role === 'super_admin'
}

/** Platform operators with shared admin-console access (not elevated super powers). */
export function isAdminOnly(role?: string): role is 'admin' {
  return role === 'admin'
}

export function canModerateAdminAccounts(role?: string): boolean {
  return isSuperAdmin(role)
}

export function canCreateAdminAccounts(role?: string): boolean {
  return isSuperAdmin(role)
}

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
      return '/dashboard'
    default:
      return '/dashboard'
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
