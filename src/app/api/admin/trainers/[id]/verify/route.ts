import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import AuditLog from '@/models/AuditLog'
import { getUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(tokenUser.role)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { action } = await req.json() // 'verify' or 'reject'
    if (!['verify', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
    }

    await connectDB()
    const trainer = await Trainer.findById(id)
    if (!trainer) return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })

    trainer.adminVerificationStatus = action === 'verify' ? 'approved' : 'rejected'
    trainer.isFullyVerified = trainer.adminVerificationStatus === 'approved' && trainer.gymVerificationStatus === 'approved'
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
