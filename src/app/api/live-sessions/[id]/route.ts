import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import LiveSession from '@/models/LiveSession'
import User from '@/models/User'
import { USER_AVATAR_POPULATE_SELECT, resolveAvatarUrl } from '@/lib/avatar'
import { getLiveSessionMeetingDetails, getLiveSessionReadDecision } from '@/lib/live-session-access.mjs'
import { normalizePlan } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'

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
    const isTrainer = Boolean(session && String(session.trainerId) === tokenUser.userId)
    const subscription = session && !isTrainer
      ? await syncUserSubscription(tokenUser.userId)
      : null
    const decision = getLiveSessionReadDecision({
      user: tokenUser,
      session,
      plan: normalizePlan(subscription?.plan),
    })
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.message }, { status: decision.status })
    }

    const trainer = await User.findById(session.trainerId).select(USER_AVATAR_POPULATE_SELECT).lean()
    const trainerAvatar = resolveAvatarUrl(trainer) || trainer?.profileImage || ''
    const meetingDetails = getLiveSessionMeetingDetails(session)

    return NextResponse.json({
      session: {
        ...session,
        _id: session._id.toString(),
        trainerId: session.trainerId.toString(),
        clientId: session.clientId ? session.clientId.toString() : null,
        participantIds: (session.participantIds || []).map((pid: { toString(): string }) => pid.toString()),
        ...meetingDetails,
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
