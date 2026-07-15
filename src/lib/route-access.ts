import type { UserRole } from '@/lib/access'

/** Dashboard routes that require a valid JWT cookie (complements client AccessGate/SignInGate). */
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/my-fitness',
  '/trainer-dashboard',
  '/gym-owner',
  '/admin',
  '/chat',
  '/settings',
  '/meal-plans',
  '/community',
  '/analytics',
  '/live-sessions',
  '/notifications',
] as const

/** Auth pages that redirect authenticated users to their workspace. */
export const GUEST_ONLY_ROUTES = [
  '/login',
  '/signup',
  '/register-trainer',
  '/register-gym-owner',
  '/forgot-password',
  '/reset-password',
] as const

export const ROLE_ROUTE_RESTRICTIONS: ReadonlyArray<{
  prefix: string
  roles: UserRole[]
}> = [
  { prefix: '/admin', roles: ['admin', 'super_admin'] },
  { prefix: '/trainer-dashboard', roles: ['trainer'] },
  { prefix: '/gym-owner', roles: ['gym_owner'] },
  { prefix: '/my-fitness', roles: ['user'] },
]

export function getRoleDashboardPath(role: string): string {
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

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
}

export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some((route) => pathname.startsWith(route))
}

export function getRoleRestriction(pathname: string) {
  return ROLE_ROUTE_RESTRICTIONS.find(({ prefix }) => pathname.startsWith(prefix))
}

export function resolvePostLoginPath(role: string, requestedPath: string | null): string {
  const fallback = getRoleDashboardPath(role)
  if (!requestedPath?.startsWith('/') || requestedPath.startsWith('//')) return fallback
  if (GUEST_ONLY_ROUTES.some((path) => requestedPath.startsWith(path))) return fallback

  const restriction = getRoleRestriction(requestedPath)
  return restriction && !restriction.roles.includes(role as UserRole) ? fallback : requestedPath
}
