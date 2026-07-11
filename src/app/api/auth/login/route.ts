import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { createToken, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    if (user.isSuspended) {
      return NextResponse.json({ message: 'Account suspended. Contact support.' }, { status: 403 })
    }

    const isValid = await bcrypt.compare(password, user.password)
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
