import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { createToken, cookieOptions } from '@/lib/auth'
import { loginBodySchema, parseJsonBody } from '@/lib/validation'
import { rateLimitAuth } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAuth(req)
    if (limited) return limited

    await connectDB()
    const parsed = await parseJsonBody(req, loginBodySchema)
    if ('error' in parsed) return parsed.error

    const { email, password } = parsed.data

    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    if (user.isSuspended) {
      return NextResponse.json({ message: 'Account suspended. Contact support.' }, { status: 403 })
    }
    if (user.isActive === false) {
      return NextResponse.json({ message: 'Account is inactive. Contact support.' }, { status: 403 })
    }

    const isValid = user.password
      ? await bcrypt.compare(password, user.password)
      : false
    if (!isValid) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    const token = createToken({ userId: user._id.toString(), role: user.role, email: user.email })
    const response = NextResponse.json({
      message: 'Logged in successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        country: user.country,
        profileImage: user.profileImage,
        subscription: user.subscription,
      },
    })

    response.cookies.set('token', token, cookieOptions())
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ message: 'Server error. Please try again.' }, { status: 500 })
  }
}
