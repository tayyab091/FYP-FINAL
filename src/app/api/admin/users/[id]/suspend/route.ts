import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { writeAuditLog } from '@/lib/audit-log'
import { createNotification } from '@/lib/notifications'
import { getUser } from '@/lib/auth'
import { parseJsonBody, parseObjectIdParam, suspendSchema } from '@/lib/validation'

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

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'user id')
    if ('error' in idResult) return idResult.error

    const parsed = await parseJsonBody(req, suspendSchema)
    if ('error' in parsed) return parsed.error
    const { suspend, reason } = parsed.data

    await connectDB()
    const target = await User.findById(idResult.id).select('fullName email role isSuspended')
    if (!target) return NextResponse.json({ message: 'User not found' }, { status: 404 })
    if (['admin', 'super_admin'].includes(target.role)) {
      return NextResponse.json({ message: 'Cannot suspend admin accounts' }, { status: 403 })
    }

    target.isSuspended = suspend
    await target.save()

    await createNotification({
      userId: target._id, title: suspend ? 'Account suspended' : 'Account restored',
      message: suspend ? 'Your account has been suspended.' + (reason ? ' ' + reason : '') : 'Your account access has been restored.',
      type: 'system', link: '/settings',
    }).catch(() => {})
    await writeAuditLog({
      actorId: tokenUser.userId,
      action: suspend ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
      targetId: target._id,
      targetModel: 'User',
      reason,
      details: { email: target.email, fullName: target.fullName, role: target.role },
    })

    return NextResponse.json({
      message: suspend ? 'User suspended' : 'User unsuspended',
      user: { _id: target._id, isSuspended: target.isSuspended },
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
