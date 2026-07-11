import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Relationship from '@/models/Relationship'
import Trainer from '@/models/Trainer'
import { getUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'trainer') {
      return NextResponse.json({ message: 'Trainers only' }, { status: 403 })
    }

    const { id } = await params
    await connectDB()
    const trainer = await Trainer.findOne({ userId: tokenUser.userId })
    if (!trainer) return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })

    const relationship = await Relationship.findOneAndDelete({
      _id: id,
      trainerId: trainer._id,
      status: 'pending',
    })
    if (!relationship) return NextResponse.json({ message: 'Request not found' }, { status: 404 })

    return NextResponse.json({ message: 'Request rejected' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
