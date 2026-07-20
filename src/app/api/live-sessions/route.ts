import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import LiveSession from '@/models/LiveSession'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import Relationship from '@/models/Relationship'
import { createJitsiRoom, isJitsiConfigured } from '@/lib/jitsi'
import { createNotification } from '@/lib/notifications'
import { normalizePlan, canAccessLiveSessions } from '@/lib/subscription'
import { liveSessionCreateSchema, parseJsonBody } from '@/lib/validation'

function sessionEndTime(scheduledAt: Date, durationMinutes: number) {
  return new Date(scheduledAt.getTime() + durationMinutes * 60_000)
}

function shapeSession(
  s: Record<string, unknown> & {
    _id: { toString(): string }
    trainerId: { toString(): string }
    clientId?: { toString(): string } | null
    participantIds?: { toString(): string }[]
    scheduledAt: Date
    durationMinutes: number
    status: string
  },
  trainerMap: Map<string, { fullName: string; profileImage?: string }>,
  clientMap: Map<string, { fullName: string; profileImage?: string }>,
) {
  const endAt = sessionEndTime(new Date(s.scheduledAt), s.durationMinutes)
  const isPast = s.status === 'ended' || endAt.getTime() < Date.now()
  const clientId = s.clientId ? s.clientId.toString() : null
  return {
    ...s,
    _id: s._id.toString(),
    trainerId: s.trainerId.toString(),
    clientId,
    participantIds: (s.participantIds || []).map((id) => id.toString()),
    isPast,
    displayStatus: isPast ? 'ended' : s.status,
    trainer: trainerMap.get(s.trainerId.toString())
      ? {
          fullName: trainerMap.get(s.trainerId.toString())!.fullName,
          profileImage: trainerMap.get(s.trainerId.toString())!.profileImage,
        }
      : null,
    client: clientId && clientMap.get(clientId)
      ? {
          fullName: clientMap.get(clientId)!.fullName,
          profileImage: clientMap.get(clientId)!.profileImage,
        }
      : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    await connectDB()
    const now = new Date()
    const pastWindow = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const ownershipFilter =
      tokenUser.role === 'trainer'
        ? { trainerId: tokenUser.userId }
        : {
            $or: [
              { clientId: tokenUser.userId },
              { participantIds: tokenUser.userId },
            ],
          }

    const sessions = await LiveSession.find({
      ...ownershipFilter,
      scheduledAt: { $gte: pastWindow },
    })
      .sort({ scheduledAt: 1 })
      .limit(50)
      .lean()

    // Mark past scheduled/live sessions as ended when their window has passed
    const toEnd = sessions.filter((s) => {
      if (s.status === 'ended') return false
      return sessionEndTime(new Date(s.scheduledAt), s.durationMinutes).getTime() < now.getTime()
    })
    if (toEnd.length > 0) {
      await LiveSession.updateMany(
        { _id: { $in: toEnd.map((s) => s._id) } },
        { $set: { status: 'ended' } },
      )
      for (const s of toEnd) {
        s.status = 'ended'
      }
    }

    const trainerIds = [...new Set(sessions.map((s) => s.trainerId.toString()))]
    const clientIds = [
      ...new Set(
        sessions
          .map((s) => (s.clientId ? s.clientId.toString() : null))
          .filter((id): id is string => Boolean(id)),
      ),
    ]
    const users = await User.find({ _id: { $in: [...trainerIds, ...clientIds] } })
      .select('fullName profileImage')
      .lean()
    const userMap = new Map(users.map((u) => [u._id.toString(), u]))

    return NextResponse.json({
      sessions: sessions.map((s) =>
        shapeSession(
          s as Parameters<typeof shapeSession>[0],
          userMap as Map<string, { fullName: string; profileImage?: string }>,
          userMap as Map<string, { fullName: string; profileImage?: string }>,
        ),
      ),
    })
  } catch (error) {
    console.error('List live sessions error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }
    if (tokenUser.role !== 'trainer') {
      return NextResponse.json({ message: 'Trainer role required' }, { status: 403 })
    }

    const parsed = await parseJsonBody(req, liveSessionCreateSchema)
    if ('error' in parsed) return parsed.error

    const title = parsed.data.title
    const scheduledAt = new Date(parsed.data.scheduledAt)
    const durationMinutes = parsed.data.durationMinutes
    const maxParticipants = parsed.data.maxParticipants
    const clientId = parsed.data.clientId

    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ message: 'Valid scheduledAt is required' }, { status: 400 })
    }
    if (scheduledAt.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ message: 'Session must be scheduled in the future' }, { status: 400 })
    }

    await connectDB()

    if (!isJitsiConfigured()) {
      return NextResponse.json({ message: 'Live video is not configured' }, { status: 503 })
    }

    let validatedClientId: string | undefined
    if (clientId) {
      const trainerProfile = await Trainer.findOne({ userId: tokenUser.userId }).select('_id').lean()
      if (!trainerProfile) {
        return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })
      }
      const relationship = await Relationship.findOne({
        trainerId: trainerProfile._id,
        userId: clientId,
        status: 'active',
      }).lean()
      if (!relationship) {
        return NextResponse.json(
          { message: 'Active client relationship required' },
          { status: 403 },
        )
      }
      validatedClientId = clientId
    }

    const roomId = randomUUID()
    const jitsiRoom = createJitsiRoom({ name: `live-${roomId}` })

    const session = await LiveSession.create({
      trainerId: tokenUser.userId,
      ...(validatedClientId ? { clientId: validatedClientId } : {}),
      title,
      scheduledAt,
      durationMinutes,
      maxParticipants: Math.min(50, Math.max(1, maxParticipants)),
      participantIds: validatedClientId ? [validatedClientId] : [],
      status: 'scheduled',
      roomId,
      meetingProvider: 'jitsi',
      meetingRoomName: jitsiRoom.name,
      meetingUrl: jitsiRoom.embedUrl,
    })

    // Notify assigned client (preferred) or all Elite clients with active relationships
    try {
      const trainerUser = await User.findById(tokenUser.userId).select('fullName').lean()
      const trainerName = trainerUser?.fullName || 'Your trainer'
      const when = scheduledAt.toLocaleString()

      if (validatedClientId) {
        const client = await User.findById(validatedClientId).select('_id subscription').lean()
        if (client && canAccessLiveSessions(normalizePlan(client.subscription?.plan))) {
          await createNotification({
            userId: client._id,
            title: 'Live session scheduled',
            message: `${trainerName} scheduled “${title}” for ${when}`,
            type: 'trainer',
            link: `/live-sessions/${session._id.toString()}`,
          }).catch(() => {})
        } else if (client) {
          // Still notify assigned client even if not Elite yet — they can upgrade
          await createNotification({
            userId: client._id,
            title: 'Live session scheduled',
            message: `${trainerName} scheduled “${title}” for ${when}. Elite is required to join.`,
            type: 'trainer',
            link: `/live-sessions/${session._id.toString()}`,
          }).catch(() => {})
        }
      } else {
        const trainerProfile = await Trainer.findOne({ userId: tokenUser.userId }).select('_id').lean()
        if (trainerProfile) {
          const relationships = await Relationship.find({
            trainerId: trainerProfile._id,
            status: 'active',
          })
            .select('userId')
            .lean()

          const clientIds = relationships.map((r) => r.userId)
          if (clientIds.length > 0) {
            const clients = await User.find({ _id: { $in: clientIds } })
              .select('_id fullName subscription')
              .lean()

            await Promise.all(
              clients
                .filter((c) => canAccessLiveSessions(normalizePlan(c.subscription?.plan)))
                .map((c) =>
                  createNotification({
                    userId: c._id,
                    title: 'New live training session',
                    message: `${trainerName} scheduled “${title}” for ${when}`,
                    type: 'trainer',
                    link: `/live-sessions/${session._id.toString()}`,
                  }).catch(() => {}),
                ),
            )
          }
        }
      }
    } catch (notifyError) {
      console.error('Live session notify error:', notifyError)
    }

    return NextResponse.json(
      {
        message: 'Live session created',
        session: {
          ...session.toObject(),
          _id: session._id.toString(),
          trainerId: session.trainerId.toString(),
          clientId: session.clientId ? session.clientId.toString() : null,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Create live session error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
