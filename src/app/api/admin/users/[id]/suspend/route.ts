import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import AuditLog from '@/models/AuditLog'
import { getUser } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(tokenUser.role)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { suspend } = await req.json()
    if (typeof suspend !== 'boolean') {
      return NextResponse.json({ message: 'suspend must be a boolean' }, { status: 400 })
    }

    await connectDB()
    const target = await User.findById(id).select('fullName email role isSuspended')
    if (!target) return NextResponse.json({ message: 'User not found' }, { status: 404 })
    if (['admin', 'super_admin'].includes(target.role)) {
      return NextResponse.json({ message: 'Cannot suspend admin accounts' }, { status: 403 })
    }

    target.isSuspended = suspend
    await target.save()

    await AuditLog.create({
      adminId: tokenUser.userId,
      action: suspend ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
      targetId: target._id,
      targetModel: 'User',
      details: { email: target.email, fullName: target.fullName },
    })

    return NextResponse.json({
      message: suspend ? 'User suspended' : 'User unsuspended',
      user: { _id: target._id, isSuspended: target.isSuspended },
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
