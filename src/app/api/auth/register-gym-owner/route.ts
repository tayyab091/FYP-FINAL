import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Gym from '@/models/Gym'
import bcrypt from 'bcryptjs'
import { createToken, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { fullName, email, password, country, gymName, gymAddress, gymDescription } = await req.json()

    if (!fullName || !email || !password || !gymName) {
      return NextResponse.json({ message: 'All fields including gym name are required' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ message: 'Email already registered' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      fullName, email: email.toLowerCase(), password: hashedPassword,
      country: country || 'Pakistan', role: 'gym_owner',
    })

    await Gym.create({
      name: gymName, address: gymAddress || 'Pakistan',
      country: country || 'Pakistan', ownerId: user._id,
      verificationStatus: 'pending',
      description: typeof gymDescription === 'string' ? gymDescription.trim() : '',
    })

    const token = createToken({ userId: user._id.toString(), role: 'gym_owner', email: user.email })
    const response = NextResponse.json({
      message: 'Gym owner account created. Pending verification.',
      user: { id: user._id, fullName, email, role: 'gym_owner' }
    }, { status: 201 })
    response.cookies.set('token', token, cookieOptions())
    return response
  } catch (error) {
    console.error('Register gym owner error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
