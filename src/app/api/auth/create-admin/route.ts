import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_ADMIN_SETUP !== 'true') {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const { fullName, email, password, setupKey } = await req.json()

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ message: 'Invalid setup key' }, { status: 403 })
    }
    if (typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json({ message: 'Valid full name is required' }, { status: 400 })
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ message: 'Valid email is required' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 12) {
      return NextResponse.json({ message: 'Password must be at least 12 characters' }, { status: 400 })
    }

    await connectDB()
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ message: 'Admin already exists', skipped: true })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const admin = await User.create({
      fullName: fullName.trim(), email: email.toLowerCase().trim(),
      password: hashedPassword, role: 'admin',
    })

    return NextResponse.json({ message: 'Admin created', id: admin._id }, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
