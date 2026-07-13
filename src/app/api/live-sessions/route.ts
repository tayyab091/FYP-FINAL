import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import LiveSession from '@/models/LiveSession'
import User from '@/models/User'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    await connectDB()
    const now = new Date()
    const sessions = await LiveSession.find({
      status: { $in: ['scheduled', 'live'] },
      scheduledAt: { $gte: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
    })
      .sort({ scheduledAt: 1 })
      .limit(50)
      .lean()

    const trainerIds = [...new Set(sessions.map((s) => s.trainerId.toString()))]
    const trainers = await User.find({ _id: { $in: trainerIds } })
      .select('fullName profileImage')
      .lean()
    const trainerMap = new Map(trainers.map((t) => [t._id.toString(), t]))

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        ...s,
        _id: s._id.toString(),
        trainerId: s.trainerId.toString(),
        participantIds: (s.participantIds || []).map((id: { toString(): string }) => id.toString()),
        trainer: trainerMap.get(s.trainerId.toString())
          ? {
              fullName: trainerMap.get(s.trainerId.toString())!.fullName,
              profileImage: trainerMap.get(s.trainerId.toString())!.profileImage,
            }
          : null,
      })),
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

    const body = await req.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
    const durationMinutes = Number(body.durationMinutes) || 60
    const maxParticipants = Number(body.maxParticipants) || 20

    if (!title || title.length < 3) {
      return NextResponse.json({ message: 'Title must be at least 3 characters' }, { status: 400 })
    }
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ message: 'Valid scheduledAt is required' }, { status: 400 })
    }
    if (scheduledAt.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ message: 'Session must be scheduled in the future' }, { status: 400 })
    }
    if (durationMinutes < 15 || durationMinutes > 240) {
      return NextResponse.json({ message: 'Duration must be 15–240 minutes' }, { status: 400 })
    }

    await connectDB()
    const session = await LiveSession.create({
      trainerId: tokenUser.userId,
      title,
      scheduledAt,
      durationMinutes,
      maxParticipants: Math.min(50, Math.max(1, maxParticipants)),
      participantIds: [],
      status: 'scheduled',
      roomId: randomUUID(),
    })

    return NextResponse.json(
      {
        message: 'Live session created',
        session: {
          ...session.toObject(),
          _id: session._id.toString(),
          trainerId: session.trainerId.toString(),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Create live session error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
