import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { createToken, cookieOptions } from '@/lib/auth'
import { getAppUrl } from '@/lib/email'

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

export async function GET(req: NextRequest) {
  const appUrl = getAppUrl()
  const code = req.nextUrl.searchParams.get('code')
  const oauthError = req.nextUrl.searchParams.get('error')

  if (oauthError || !code) {
    return NextResponse.redirect(`${appUrl}/login?error=google_oauth`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/login?error=google_not_configured`)
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
      return NextResponse.redirect(`${appUrl}/login?error=google_token`)
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = (await profileRes.json()) as GoogleProfile

    if (!profileRes.ok || !profile.email) {
      console.error('Google profile fetch failed:', profile)
      return NextResponse.redirect(`${appUrl}/login?error=google_profile`)
    }

    await connectDB()
    const email = profile.email.toLowerCase().trim()
    let user = await User.findOne({ email })

    if (!user) {
      const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 12)
      user = await User.create({
        fullName: (profile.name || email.split('@')[0] || 'Google User').trim(),
        email,
        password: randomPassword,
        role: 'user',
        profileImage: profile.picture || '',
        emailVerified: profile.verified_email !== false,
      })
    } else {
      if (user.isSuspended || user.isActive === false) {
        return NextResponse.redirect(`${appUrl}/login?error=account_disabled`)
      }
      if (!user.emailVerified && profile.verified_email) {
        user.emailVerified = true
        await user.save()
      }
    }

    const token = createToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    })

    const response = NextResponse.redirect(`${appUrl}/my-fitness`)
    response.cookies.set('token', token, cookieOptions())
    return response
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(`${appUrl}/login?error=google_oauth`)
  }
}
