import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { createSecureToken, sendPasswordResetEmail } from '@/lib/auth-email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    const normalized =
      typeof email === 'string' ? email.toLowerCase().trim() : ''

    const payload: { message: string; devLink?: string } = {
      message: 'If an account exists for that email, a reset link has been sent.',
    }

    if (!normalized || !normalized.includes('@')) {
      return NextResponse.json(payload)
    }

    await connectDB()
    const user = await User.findOne({ email: normalized })
    if (!user) return NextResponse.json(payload)

    const token = createSecureToken()
    user.resetPasswordToken = token
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    const result = await sendPasswordResetEmail(user.email, token).catch((err) => {
      console.error('Forgot password email error:', err)
      return null
    })

    // Only expose the link in non-production when SMTP is unset (console fallback)
    if (process.env.NODE_ENV !== 'production' && result?.devLink) {
      payload.devLink = result.devLink
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({
      message: 'If an account exists for that email, a reset link has been sent.',
    })
  }
}
