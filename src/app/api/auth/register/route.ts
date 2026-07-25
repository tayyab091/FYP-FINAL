import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { createToken, cookieOptions } from '@/lib/auth'
import { createSecureToken, sendVerificationEmail } from '@/lib/auth-email'
import { parseJsonBody, registerBodySchema } from '@/lib/validation'
import { rateLimitAuth } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAuth(req)
    if (limited) return limited

    await connectDB()
    const parsed = await parseJsonBody(req, registerBodySchema)
    if ('error' in parsed) return parsed.error

    const { fullName, email, password, country } = parsed.data

    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json({ message: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const verifyToken = createSecureToken()
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      country: country || 'Pakistan',
      role: 'user',
      emailVerified: false,
      verifyEmailToken: verifyToken,
      verifyEmailExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      authProviders: ['password'],
    })

    const emailResult = await sendVerificationEmail(user.email, verifyToken).catch((err) => {
      console.error('Verification email error:', err)
      return null
    })

    const token = createToken({ userId: user._id.toString(), role: user.role, email: user.email })
    const body: {
      message: string
      user: { id: unknown; fullName: string; email: string; role: string; subscription: unknown }
      devLink?: string
    } = {
      message: 'Account created successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
      },
    }
    if (process.env.NODE_ENV !== 'production' && emailResult?.devLink) {
      body.devLink = emailResult.devLink
    }

    const response = NextResponse.json(body, { status: 201 })

    response.cookies.set('token', token, cookieOptions())
    return response
  } catch (error: unknown) {
    console.error('Register error:', error)
    return NextResponse.json({ message: 'Server error. Please try again.' }, { status: 500 })
  }
}
