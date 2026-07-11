import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Relationship from '@/models/Relationship'
import Trainer from '@/models/Trainer'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'trainer') return NextResponse.json({ message: 'Trainers only' }, { status: 403 })

    await connectDB()
    const trainer = await Trainer.findOne({ userId: tokenUser.userId })
    if (!trainer) return NextResponse.json([])

    const requests = await Relationship.find({ trainerId: trainer._id, status: 'pending' })
      .populate('userId', 'fullName email profileImage country')
      .lean()

    return NextResponse.json(requests)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
