import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { createSecureToken, sendPasswordResetEmail } from '@/lib/auth-email'
import { forgotPasswordSchema, parseJsonBody } from '@/lib/validation'
import { rateLimitAuth } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAuth(req)
    if (limited) return limited

    const payload: { message: string; devLink?: string } = {
      message: 'If an account exists for that email, a reset link has been sent.',
    }

    const parsed = await parseJsonBody(req, forgotPasswordSchema)
    // Always return generic message for invalid shape (no email enumeration)
    if ('error' in parsed) {
      return NextResponse.json(payload)
    }

    const { email } = parsed.data

    await connectDB()
    const user = await User.findOne({ email })
    if (!user) return NextResponse.json(payload)

    const token = createSecureToken()
    user.resetPasswordToken = token
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    const result = await sendPasswordResetEmail(user.email, token).catch((err) => {
      console.error('Forgot password email error:', err)
      return null
    })

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
