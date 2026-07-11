import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { createToken, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { fullName, email, password, country, specialty, bio, experience } = await req.json()

    if (typeof fullName !== 'string' || typeof email !== 'string' || !fullName.trim() || !email.trim() || !password) {
      return NextResponse.json({ message: 'Name, email and password required' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedName = fullName.trim()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      return NextResponse.json({ message: 'Email already registered' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const session = await mongoose.startSession()
    const user = await session.withTransaction(async () => {
      const [createdUser] = await User.create([{
        fullName: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        country: country || 'Pakistan',
        role: 'trainer',
      }], { session })

      await Trainer.create([{
        userId: createdUser._id,
        name: normalizedName,
        email: normalizedEmail,
        specialty: Array.isArray(specialty) ? specialty : [specialty].filter(Boolean),
        country: country || 'Pakistan',
        bio: bio || '',
        experience: experience || '',
        isFullyVerified: false,
        isActive: true,
      }], { session })
      return createdUser
    }).finally(() => session.endSession())
    if (!user) throw new Error('Trainer registration transaction did not complete')

    const token = createToken({ userId: user._id.toString(), role: 'trainer', email: user.email })
    const response = NextResponse.json({
      message: 'Trainer account created. Pending verification.',
      user: { id: user._id, fullName: normalizedName, email: normalizedEmail, role: 'trainer' }
    }, { status: 201 })
    response.cookies.set('token', token, cookieOptions())
    return response
  } catch (error) {
    console.error('Register trainer error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
