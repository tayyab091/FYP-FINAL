import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import LiveSession from '@/models/LiveSession'
import { normalizePlan } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'

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

    const endAt = new Date(
      new Date(session.scheduledAt).getTime() + session.durationMinutes * 60_000,
    )
    if (session.status === 'ended' || endAt.getTime() < Date.now()) {
      if (session.status !== 'ended') {
        session.status = 'ended'
        await session.save()
      }
      return NextResponse.json({ message: 'This session has ended' }, { status: 400 })
    }

    const isTrainer = session.trainerId.toString() === tokenUser.userId
    const assignedClientId = session.clientId ? session.clientId.toString() : null
    const isAssignedClient = Boolean(assignedClientId && assignedClientId === tokenUser.userId)
    const alreadyJoined = session.participantIds.some(
      (pid: { toString(): string }) => pid.toString() === tokenUser.userId,
    )

    // When a client is assigned, only trainer or that client may join
    if (assignedClientId && !isTrainer && !isAssignedClient) {
      return NextResponse.json(
        { message: 'You are not invited to this session' },
        { status: 403 },
      )
    }

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

    if (!alreadyJoined && !isTrainer) {
      if (session.participantIds.length >= session.maxParticipants) {
        return NextResponse.json({ message: 'Session is full' }, { status: 400 })
      }
      session.participantIds.push(tokenUser.userId as unknown as (typeof session.participantIds)[0])
    }

    if (session.status === 'scheduled') {
      session.status = 'live'
    }
    await session.save()

    const meetingUrl = session.meetingUrl || session.dailyRoomUrl || ''
    if (!meetingUrl) {
      return NextResponse.json(
        { message: 'Meeting room is unavailable. Please try again or contact support.' },
        { status: 503 },
      )
    }

    return NextResponse.json({
      message: 'Joined session',
      session: {
        _id: session._id.toString(),
        roomId: session.roomId,
        meetingProvider: session.meetingProvider || (session.dailyRoomUrl ? 'daily' : 'jitsi'),
        meetingUrl,
        meetingRoomName: session.meetingRoomName || session.dailyRoomName || '',
        title: session.title,
        status: session.status,
        trainerId: session.trainerId.toString(),
        clientId: session.clientId ? session.clientId.toString() : null,
        participantIds: session.participantIds.map((pid: { toString(): string }) => pid.toString()),
      },
    })
  } catch (error) {
    console.error('Join live session error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
