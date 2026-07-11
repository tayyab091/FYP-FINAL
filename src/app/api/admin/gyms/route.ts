import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Gym from '@/models/Gym'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(tokenUser.role)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    await connectDB()
    const gyms = await Gym.find({})
      .populate('ownerId', 'fullName email')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(gyms)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
