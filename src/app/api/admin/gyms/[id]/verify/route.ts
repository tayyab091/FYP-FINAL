import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Gym from '@/models/Gym'
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
    const { action } = await req.json()
    if (!['verify', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
    }
    await connectDB()

    const gym = await Gym.findByIdAndUpdate(id,
      { verificationStatus: action === 'verify' ? 'verified' : 'rejected' },
      { new: true }
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
