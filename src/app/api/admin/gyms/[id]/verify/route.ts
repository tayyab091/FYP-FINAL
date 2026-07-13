import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Gym from '@/models/Gym'
import AuditLog from '@/models/AuditLog'
import { getUser } from '@/lib/auth'
import { adminActionSchema, parseJsonBody, parseObjectIdParam } from '@/lib/validation'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(tokenUser.role)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'gym id')
    if ('error' in idResult) return idResult.error

    const parsed = await parseJsonBody(req, adminActionSchema)
    if ('error' in parsed) return parsed.error
    const { action } = parsed.data

    await connectDB()

    const gym = await Gym.findByIdAndUpdate(
      idResult.id,
      { verificationStatus: action === 'verify' ? 'verified' : 'rejected' },
      { new: true },
    )
    if (!gym) return NextResponse.json({ message: 'Gym not found' }, { status: 404 })

    await AuditLog.create({
      adminId: tokenUser.userId,
      action: action === 'verify' ? 'GYM_VERIFIED' : 'GYM_REJECTED',
      targetId: gym._id,
      targetModel: 'Gym',
      details: { gymName: gym.name },
    })

    return NextResponse.json({ message: `Gym ${action === 'verify' ? 'verified' : 'rejected'}`, gym })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
