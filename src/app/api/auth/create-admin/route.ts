import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, setupKey } = await req.json()

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ message: 'Invalid setup key' }, { status: 403 })
    }

    await connectDB()
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ message: 'Admin already exists', skipped: true })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const admin = await User.create({
      fullName, email: email.toLowerCase(),
      password: hashedPassword, role: 'admin',
    })

    return NextResponse.json({ message: 'Admin created', id: admin._id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
