import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import bcrypt from 'bcryptjs'
import { createToken, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { fullName, email, password, country, specialty, bio, experience } = await req.json()

    if (!fullName || !email || !password) {
      return NextResponse.json({ message: 'Name, email and password required' }, { status: 400 })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ message: 'Email already registered' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      fullName, email: email.toLowerCase(), password: hashedPassword,
      country: country || 'Pakistan', role: 'trainer',
    })

    await Trainer.create({
      userId: user._id, name: fullName, email: email.toLowerCase(),
      specialty: Array.isArray(specialty) ? specialty : [specialty].filter(Boolean),
      country: country || 'Pakistan', bio: bio || '',
      experience: experience || '', isFullyVerified: false, isActive: true,
    })

    const token = createToken({ userId: user._id.toString(), role: 'trainer', email: user.email })
    const response = NextResponse.json({
      message: 'Trainer account created. Pending verification.',
      user: { id: user._id, fullName, email, role: 'trainer' }
    }, { status: 201 })
    response.cookies.set('token', token, cookieOptions())
    return response
  } catch (error) {
    console.error('Register trainer error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
