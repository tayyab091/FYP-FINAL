import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import { getUser } from '@/lib/auth'
import { USER_AVATAR_POPULATE_SELECT } from '@/lib/avatar'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(tokenUser.role)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    await connectDB()
    const trainers = await Trainer.find({})
      .populate('userId', USER_AVATAR_POPULATE_SELECT)
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(trainers)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
