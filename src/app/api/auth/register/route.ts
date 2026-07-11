import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { createToken, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { fullName, email, password, country } = await req.json()

    if (!fullName || !email || !password) {
      return NextResponse.json({ message: 'Full name, email and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ message: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      country: country || 'Pakistan',
      role: 'user',
    })

    const token = createToken({ userId: user._id.toString(), role: user.role, email: user.email })
    const response = NextResponse.json({
      message: 'Account created successfully',
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, subscription: user.subscription },
    }, { status: 201 })

    response.cookies.set('token', token, cookieOptions())
    return response
  } catch (error: unknown) {
    console.error('Register error:', error)
    return NextResponse.json({ message: 'Server error. Please try again.' }, { status: 500 })
  }
}
