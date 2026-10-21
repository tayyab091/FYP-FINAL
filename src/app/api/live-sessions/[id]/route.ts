import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import LiveSession from '@/models/LiveSession'
import User from '@/models/User'
import { USER_AVATAR_POPULATE_SELECT, resolveAvatarUrl } from '@/lib/avatar'

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

    const trainer = await User.findById(session.trainerId).select(USER_AVATAR_POPULATE_SELECT).lean()
    const trainerAvatar = resolveAvatarUrl(trainer) || trainer?.profileImage || ''

    return NextResponse.json({
      session: {
        ...session,
        _id: session._id.toString(),
        trainerId: session.trainerId.toString(),
        clientId: session.clientId ? session.clientId.toString() : null,
        participantIds: (session.participantIds || []).map((pid: { toString(): string }) => pid.toString()),
        meetingProvider: session.meetingProvider || (session.dailyRoomUrl ? 'daily' : 'jitsi'),
        meetingRoomName: session.meetingRoomName || session.dailyRoomName || '',
        meetingUrl: session.meetingUrl || session.dailyRoomUrl || '',
        trainer: trainer
          ? {
              fullName: trainer.fullName,
              profileImage: trainerAvatar,
              avatarUrl: trainerAvatar,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Get live session error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
