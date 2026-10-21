import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { getUser } from '@/lib/auth'
import { canCreateAdminAccounts, canModerateAdminAccounts } from '@/lib/access'
import { writeAuditLog } from '@/lib/audit-log'
import { parseJsonBody, superAdminCreateSchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!canModerateAdminAccounts(tokenUser.role)) {
      return NextResponse.json({ message: 'Super admin access required' }, { status: 403 })
    }

    await connectDB()
    const admins = await User.find({ role: 'admin' })
      .select('fullName email role isSuspended subscription createdAt')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(admins)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!canCreateAdminAccounts(tokenUser.role)) {
      return NextResponse.json({ message: 'Super admin access required' }, { status: 403 })
    }

    const parsed = await parseJsonBody(req, superAdminCreateSchema)
    if ('error' in parsed) return parsed.error
    const { fullName, email, password } = parsed.data

    await connectDB()
    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json({ message: 'Email already registered' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const admin = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
    })

    await writeAuditLog({
      actorId: tokenUser.userId,
      action: 'ADMIN_CREATED',
      targetId: admin._id,
      targetModel: 'User',
      details: { email: admin.email, fullName: admin.fullName },
    })

    return NextResponse.json(
      {
        message: 'Admin account created',
        admin: {
          _id: admin._id,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
        },
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
