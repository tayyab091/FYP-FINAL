import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getAppUrl } from '@/lib/email'
import { cookieOptions } from '@/lib/auth'

const OAUTH_STATE_COOKIE = 'google_oauth_state'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { message: 'Google OAuth is not configured' },
      { status: 503 },
    )
  }

  const state = randomBytes(24).toString('hex')
  const redirectUri = `${getAppUrl()}/api/auth/oauth/google/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  })

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  )
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    ...cookieOptions(),
    maxAge: 60 * 10,
    httpOnly: true,
  })
  return response
}
