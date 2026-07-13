import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { createToken, cookieOptions } from '@/lib/auth'
import { createSecureToken, sendVerificationEmail } from '@/lib/auth-email'
import { parseJsonBody, registerTrainerSchema } from '@/lib/validation'
import { rateLimitAuth } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAuth(req)
    if (limited) return limited

    await connectDB()
    const parsed = await parseJsonBody(req, registerTrainerSchema)
    if ('error' in parsed) return parsed.error

    const { fullName, email, password, country, specialty, bio, experience } = parsed.data

    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json({ message: 'Email already registered' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const verifyToken = createSecureToken()
    const session = await mongoose.startSession()
    const user = await session.withTransaction(async () => {
      const [createdUser] = await User.create([{
        fullName,
        email,
        password: hashedPassword,
        country: country || 'Pakistan',
        role: 'trainer',
        emailVerified: false,
        verifyEmailToken: verifyToken,
        verifyEmailExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }], { session })

      await Trainer.create([{
        userId: createdUser._id,
        name: fullName,
        email,
        specialty: specialty || [],
        country: country || 'Pakistan',
        bio: bio || '',
        experience: experience || '',
        isFullyVerified: false,
        isActive: true,
      }], { session })
      return createdUser
    }).finally(() => session.endSession())
    if (!user) throw new Error('Trainer registration transaction did not complete')

    void sendVerificationEmail(email, verifyToken).catch((err) => {
      console.error('Verification email error:', err)
    })

    const token = createToken({ userId: user._id.toString(), role: 'trainer', email: user.email })
    const response = NextResponse.json({
      message: 'Trainer account created. Pending verification.',
      user: { id: user._id, fullName, email, role: 'trainer' },
    }, { status: 201 })
    response.cookies.set('token', token, cookieOptions())
    return response
  } catch (error) {
    console.error('Register trainer error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
