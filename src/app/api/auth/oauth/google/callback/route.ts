import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { createToken, cookieOptions } from '@/lib/auth'
import { getAppUrl } from '@/lib/email'
import { getRoleDashboardPath } from '@/lib/route-access'

const OAUTH_STATE_COOKIE = 'google_oauth_state'

interface GoogleTokenResponse {
  access_token?: string
  error?: string
}

interface GoogleProfile {
  id?: string
  email?: string
  verified_email?: boolean
  name?: string
  picture?: string
}

function clearOAuthState(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, '', { ...cookieOptions(), maxAge: 0 })
}

function ensureProviders(providers: string[] | undefined, provider: 'password' | 'google') {
  const set = new Set(providers?.length ? providers : [])
  set.add(provider)
  return Array.from(set)
}

export async function GET(req: NextRequest) {
  const appUrl = getAppUrl()
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const oauthError = req.nextUrl.searchParams.get('error')
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value

  if (oauthError || !code) {
    const response = NextResponse.redirect(`${appUrl}/login?error=google_oauth`)
    clearOAuthState(response)
    return response
  }

  if (!state || !expectedState || state !== expectedState) {
    const response = NextResponse.redirect(`${appUrl}/login?error=google_state`)
    clearOAuthState(response)
    return response
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    const response = NextResponse.redirect(`${appUrl}/login?error=google_not_configured`)
    clearOAuthState(response)
    return response
  }

  try {
    const redirectUri = `${appUrl}/api/auth/oauth/google/callback`
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Google token exchange failed:', tokenData)
      const response = NextResponse.redirect(`${appUrl}/login?error=google_token`)
      clearOAuthState(response)
      return response
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = (await profileRes.json()) as GoogleProfile

    if (!profileRes.ok || !profile.email || !profile.id) {
      console.error('Google profile fetch failed:', profile)
      const response = NextResponse.redirect(`${appUrl}/login?error=google_profile`)
      clearOAuthState(response)
      return response
    }

    await connectDB()
    const email = profile.email.toLowerCase().trim()
    const googleId = profile.id

    let user =
      (await User.findOne({ googleId })) ||
      (await User.findOne({ email }))

    if (!user) {
      const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 12)
      user = await User.create({
        fullName: (profile.name || email.split('@')[0] || 'Google User').trim(),
        email,
        password: randomPassword,
        role: 'user',
        profileImage: profile.picture || '',
        emailVerified: profile.verified_email !== false,
        googleId,
        authProviders: ['google'],
      })
    } else {
      if (user.isSuspended || user.isActive === false) {
        const response = NextResponse.redirect(`${appUrl}/login?error=account_disabled`)
        clearOAuthState(response)
        return response
      }

      // Link Google to existing password account with the same email
      let dirty = false
      if (!user.googleId) {
        user.googleId = googleId
        dirty = true
      } else if (user.googleId !== googleId) {
        const response = NextResponse.redirect(`${appUrl}/login?error=google_conflict`)
        clearOAuthState(response)
        return response
      }

      const nextProviders = ensureProviders(
        Array.isArray(user.authProviders) ? user.authProviders : ['password'],
        'google',
      )
      if (
        !user.authProviders ||
        user.authProviders.length !== nextProviders.length ||
        nextProviders.some((p) => !user!.authProviders.includes(p))
      ) {
        user.authProviders = nextProviders
        dirty = true
      }

      if (!user.emailVerified && profile.verified_email) {
        user.emailVerified = true
        dirty = true
      }
      if (!user.profileImage && profile.picture) {
        user.profileImage = profile.picture
        dirty = true
      }
      if (dirty) await user.save()
    }

    const token = createToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    })

    const response = NextResponse.redirect(`${appUrl}${getRoleDashboardPath(user.role)}`)
    response.cookies.set('token', token, cookieOptions())
    clearOAuthState(response)
    return response
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    const response = NextResponse.redirect(`${appUrl}/login?error=google_oauth`)
    clearOAuthState(response)
    return response
  }
}
