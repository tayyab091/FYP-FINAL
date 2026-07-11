import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const PROTECTED = [
  '/my-fitness',
  '/trainer-dashboard',
  '/gym-owner',
  '/admin',
  '/chat',
  '/settings',
]

const GUEST_ONLY = ['/login', '/signup', '/register-trainer', '/register-gym-owner']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value
  let role = ''
  if (token && process.env.JWT_SECRET) {
    try {
      role = (jwt.verify(token, process.env.JWT_SECRET) as { role?: string }).role || ''
    } catch {
      role = ''
    }
  }
  const isLoggedIn = Boolean(role)

  if (PROTECTED.some((route) => pathname.startsWith(route)) && !isLoggedIn) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (GUEST_ONLY.some((route) => pathname.startsWith(route)) && isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const requiredRoles: Array<{ prefix: string; roles: string[] }> = [
    { prefix: '/admin', roles: ['admin', 'super_admin'] },
    { prefix: '/trainer-dashboard', roles: ['trainer'] },
    { prefix: '/gym-owner', roles: ['gym_owner'] },
  ]
  const restriction = requiredRoles.find(({ prefix }) => pathname.startsWith(prefix))
  if (restriction && !restriction.roles.includes(role)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.gif$).*)',
  ],
}
