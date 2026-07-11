import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import Relationship from '@/models/Relationship'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(tokenUser.role)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    await connectDB()
    const [totalUsers, totalTrainers, pendingTrainers, activeRelationships] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Trainer.countDocuments(),
      Trainer.countDocuments({ isFullyVerified: false }),
      Relationship.countDocuments({ status: 'active' }),
    ])

    return NextResponse.json({
      totalUsers,
      totalTrainers,
      pendingVerifications: pendingTrainers,
      activeRelationships,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
