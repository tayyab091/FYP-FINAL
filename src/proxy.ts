import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PROTECTED = [
  '/dashboard',
  '/my-fitness',
  '/trainer-dashboard',
  '/gym-owner',
  '/admin',
  '/chat',
  '/settings',
]

const GUEST_ONLY = ['/login', '/signup', '/register-trainer', '/register-gym-owner']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value
  let role = ''
  if (token && process.env.JWT_SECRET) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET),
        { algorithms: ['HS256'] },
      )
      role = typeof payload.role === 'string' ? payload.role : ''
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
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const requiredRoles: Array<{ prefix: string; roles: string[] }> = [
    { prefix: '/admin', roles: ['admin', 'super_admin'] },
    { prefix: '/trainer-dashboard', roles: ['trainer'] },
    { prefix: '/gym-owner', roles: ['gym_owner'] },
    { prefix: '/my-fitness', roles: ['user'] },
  ]
  const restriction = requiredRoles.find(({ prefix }) => pathname.startsWith(prefix))
  if (restriction && !restriction.roles.includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.gif$).*)',
  ],
}
