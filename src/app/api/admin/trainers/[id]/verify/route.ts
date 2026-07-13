import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
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
    const idResult = parseObjectIdParam(rawId, 'trainer id')
    if ('error' in idResult) return idResult.error

    const parsed = await parseJsonBody(req, adminActionSchema)
    if ('error' in parsed) return parsed.error
    const { action } = parsed.data

    await connectDB()
    const trainer = await Trainer.findById(idResult.id)
    if (!trainer) return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })

    trainer.adminVerificationStatus = action === 'verify' ? 'approved' : 'rejected'
    const gymApproved = !trainer.gymId || trainer.gymVerificationStatus === 'approved'
    trainer.isFullyVerified = trainer.adminVerificationStatus === 'approved' && gymApproved
    await trainer.save()

    await AuditLog.create({
      adminId: tokenUser.userId,
      action: action === 'verify' ? 'TRAINER_VERIFIED' : 'TRAINER_REJECTED',
      targetId: trainer._id,
      targetModel: 'Trainer',
      details: { trainerName: trainer.name },
    })

    return NextResponse.json({ message: `Trainer ${action === 'verify' ? 'verified' : 'rejected'}`, trainer })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
