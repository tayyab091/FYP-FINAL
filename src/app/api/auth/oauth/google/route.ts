import { NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/email'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { message: 'Google OAuth is not configured' },
      { status: 503 },
    )
  }

  const redirectUri = `${getAppUrl()}/api/auth/oauth/google/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  )
}
