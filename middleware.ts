import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = [
  '/my-fitness',
  '/trainer-dashboard',
  '/gym-owner',
  '/admin',
  '/chat',
  '/settings',
]

const GUEST_ONLY = ['/login', '/signup', '/register-trainer', '/register-gym-owner']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value
  const isLoggedIn = !!token

  if (PROTECTED.some(r => pathname.startsWith(r)) && !isLoggedIn) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (GUEST_ONLY.some(r => pathname.startsWith(r)) && isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.gif$).*)',
  ],
}
