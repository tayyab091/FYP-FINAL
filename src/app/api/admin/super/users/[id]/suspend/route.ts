import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { getUser } from '@/lib/auth'
import { canModerateAdminAccounts } from '@/lib/access'
import { writeAuditLog } from '@/lib/audit-log'
import { parseJsonBody, parseObjectIdParam, superAdminSuspendSchema } from '@/lib/validation'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!canModerateAdminAccounts(tokenUser.role)) {
      return NextResponse.json({ message: 'Super admin access required' }, { status: 403 })
    }

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'user id')
    if ('error' in idResult) return idResult.error

    const parsed = await parseJsonBody(req, superAdminSuspendSchema)
    if ('error' in parsed) return parsed.error
    const { suspend, reason } = parsed.data

    await connectDB()
    const target = await User.findById(idResult.id).select('fullName email role isSuspended')
    if (!target) return NextResponse.json({ message: 'User not found' }, { status: 404 })
    if (target.role !== 'admin') {
      return NextResponse.json({ message: 'Target must be an admin account' }, { status: 403 })
    }

    target.isSuspended = suspend
    await target.save()

    await writeAuditLog({
      actorId: tokenUser.userId,
      action: suspend ? 'ADMIN_SUSPENDED' : 'ADMIN_UNSUSPENDED',
      targetId: target._id,
      targetModel: 'User',
      reason,
      details: { email: target.email, fullName: target.fullName, role: target.role },
    })

    return NextResponse.json({
      message: suspend ? 'Admin suspended' : 'Admin reinstated',
      user: { _id: target._id, isSuspended: target.isSuspended },
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
