import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import LiveSession from '@/models/LiveSession'
import User from '@/models/User'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    await connectDB()

    const session = await LiveSession.findById(id).lean()
    if (!session) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 })
    }

    const trainer = await User.findById(session.trainerId).select('fullName profileImage').lean()

    return NextResponse.json({
      session: {
        ...session,
        _id: session._id.toString(),
        trainerId: session.trainerId.toString(),
        participantIds: (session.participantIds || []).map((pid: { toString(): string }) => pid.toString()),
        trainer: trainer
          ? { fullName: trainer.fullName, profileImage: trainer.profileImage }
          : null,
      },
    })
  } catch (error) {
    console.error('Get live session error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
