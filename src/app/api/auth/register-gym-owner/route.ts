import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Gym from '@/models/Gym'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { createToken, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { fullName, email, password, country, gymName, gymAddress, gymDescription } = await req.json()

    if (
      typeof fullName !== 'string' ||
      typeof email !== 'string' ||
      typeof gymName !== 'string' ||
      !fullName.trim() ||
      !email.trim() ||
      !gymName.trim() ||
      !password
    ) {
      return NextResponse.json({ message: 'All fields including gym name are required' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedName = fullName.trim()
    const normalizedGymName = gymName.trim()
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
        role: 'gym_owner',
      }], { session })

      await Gym.create([{
        name: normalizedGymName,
        address: typeof gymAddress === 'string' && gymAddress.trim() ? gymAddress.trim() : 'Pakistan',
        country: country || 'Pakistan',
        ownerId: createdUser._id,
        verificationStatus: 'pending',
        description: typeof gymDescription === 'string' ? gymDescription.trim() : '',
      }], { session })
      return createdUser
    }).finally(() => session.endSession())
    if (!user) throw new Error('Gym registration transaction did not complete')

    const token = createToken({ userId: user._id.toString(), role: 'gym_owner', email: user.email })
    const response = NextResponse.json({
      message: 'Gym owner account created. Pending verification.',
      user: { id: user._id, fullName: normalizedName, email: normalizedEmail, role: 'gym_owner' }
    }, { status: 201 })
    response.cookies.set('token', token, cookieOptions())
    return response
  } catch (error) {
    console.error('Register gym owner error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
