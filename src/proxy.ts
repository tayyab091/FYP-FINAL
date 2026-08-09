import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { mealSlug } from '@/lib/meal-slug'
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

async function redirectNumericNutritionUrl(request: NextRequest): Promise<NextResponse | null> {
  const match = request.nextUrl.pathname.match(/^\/nutrition\/(\d+)$/)
  if (!match) return null

  const mealId = match[1]
  try {
    const res = await fetch(`${request.nextUrl.origin}/api/meals?id=${encodeURIComponent(mealId)}`, {
      headers: { accept: 'application/json' },
    })
    if (!res.ok) return null

    const meal = (await res.json()) as { id?: string; name?: string }
    const slug = mealSlug(meal.name || '', meal.id || mealId)
    if (slug === mealId) return null

    // #region agent log
    fetch('http://127.0.0.1:7893/ingest/3b5841b0-46ed-4652-9b9f-279e38a5ba27', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1483ff' },
      body: JSON.stringify({
        sessionId: '1483ff',
        hypothesisId: 'H2',
        runId: 'post-fix',
        location: 'proxy.ts:redirectNumericNutritionUrl',
        message: 'middleware numeric nutrition redirect',
        data: { mealId, slug, mealName: meal.name },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    return NextResponse.redirect(new URL(`/nutrition/${slug}`, request.url), 308)
  } catch {
    return null
  }
}

/** Edge-safe route protection — jose JWT only (no Node fs / Mongoose). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const nutritionRedirect = await redirectNumericNutritionUrl(request)
  if (nutritionRedirect) return nutritionRedirect

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
