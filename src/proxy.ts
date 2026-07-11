import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import {
  getRoleDashboardPath,
  getRoleRestriction,
  isGuestOnlyPath,
  isProtectedPath,
} from '@/lib/route-access'

async function getRoleFromToken(token: string | undefined): Promise<string> {
  if (!token || !process.env.JWT_SECRET) return ''
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET),
      { algorithms: ['HS256'] },
    )
    return typeof payload.role === 'string' ? payload.role : ''
  } catch {
    return ''
  }
}

/** Server-side route protection — complements client AccessGate/SignInGate. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const role = await getRoleFromToken(request.cookies.get('token')?.value)
  const isLoggedIn = Boolean(role)

  if (isProtectedPath(pathname) && !isLoggedIn) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (isGuestOnlyPath(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL(getRoleDashboardPath(role), request.url))
  }

  const restriction = getRoleRestriction(pathname)
  if (restriction && !restriction.roles.includes(role as (typeof restriction.roles)[number])) {
    return NextResponse.redirect(new URL(getRoleDashboardPath(role), request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.gif$).*)',
  ],
}
