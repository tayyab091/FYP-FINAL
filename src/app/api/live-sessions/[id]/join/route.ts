import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import LiveSession from '@/models/LiveSession'
import { syncUserSubscription, normalizePlan } from '@/lib/subscription'

export async function POST(
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

    const session = await LiveSession.findById(id)
    if (!session) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 })
    }
    if (session.status === 'ended') {
      return NextResponse.json({ message: 'This session has ended' }, { status: 400 })
    }

    const isTrainer = session.trainerId.toString() === tokenUser.userId
    if (!isTrainer) {
      const subscription = await syncUserSubscription(tokenUser.userId)
      const plan = normalizePlan(subscription?.plan)
      if (plan !== 'elite') {
        return NextResponse.json(
          { message: 'Elite membership required to join live sessions' },
          { status: 403 },
        )
      }
    }

    const alreadyJoined = session.participantIds.some(
      (pid: { toString(): string }) => pid.toString() === tokenUser.userId,
    )

    if (!alreadyJoined && !isTrainer) {
      if (session.participantIds.length >= session.maxParticipants) {
        return NextResponse.json({ message: 'Session is full' }, { status: 400 })
      }
      session.participantIds.push(tokenUser.userId as unknown as typeof session.participantIds[0])
    }

    if (session.status === 'scheduled') {
      session.status = 'live'
    }
    await session.save()

    return NextResponse.json({
      message: 'Joined session',
      session: {
        _id: session._id.toString(),
        roomId: session.roomId,
        title: session.title,
        status: session.status,
        trainerId: session.trainerId.toString(),
        participantIds: session.participantIds.map((pid: { toString(): string }) => pid.toString()),
      },
    })
  } catch (error) {
    console.error('Join live session error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
