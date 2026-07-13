import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { createAdminSchema, parseJsonBody } from '@/lib/validation'
import { rateLimitAuth } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitAuth(req)
    if (limited) return limited

    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_ADMIN_SETUP !== 'true') {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const parsed = await parseJsonBody(req, createAdminSchema)
    if ('error' in parsed) return parsed.error

    const { fullName, email, password, setupKey } = parsed.data

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ message: 'Invalid setup key' }, { status: 403 })
    }

    await connectDB()
    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json({ message: 'Admin already exists', skipped: true })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const admin = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: 'admin',
    })

    return NextResponse.json({ message: 'Admin created', id: admin._id }, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
