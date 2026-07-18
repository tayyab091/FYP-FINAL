/** Routes that use DashboardShell (public Navbar/Footer should hide). */
export const DASHBOARD_SHELL_PREFIXES = [
  '/dashboard',
  '/admin',
  '/gym-owner',
  '/trainer-dashboard',
  '/my-fitness',
  '/chat',
  '/settings',
  '/meal-plans',
  '/community',
  '/analytics',
  '/live-sessions',
  '/notifications',
] as const

/** Auth pages: hide marketing Navbar/Footer (auth layout has its own chrome). */
export const AUTH_PREFIXES = [
  '/login',
  '/signup',
  '/register-trainer',
  '/register-gym-owner',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
] as const

export function isDashboardShellPath(pathname: string) {
  return DASHBOARD_SHELL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function isAuthPath(pathname: string) {
  return AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Hide global marketing Navbar on app shell + auth screens. */
export function shouldHidePublicNavbar(pathname: string) {
  return isDashboardShellPath(pathname) || isAuthPath(pathname)
}

/** Hide SiteFooter on app shell + auth screens. */
export function shouldHideSiteFooter(pathname: string) {
  return isDashboardShellPath(pathname) || isAuthPath(pathname)
}
