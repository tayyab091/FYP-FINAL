import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Relationship from '@/models/Relationship'
import Conversation from '@/models/Conversation'
import Trainer from '@/models/Trainer'
import { getUser } from '@/lib/auth'
import { awardXp, XP_REWARDS } from '@/lib/gamification'

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

    const relationship = await Relationship.findOne({
      _id: id,
      trainerId: trainer._id,
      status: 'pending',
    })
    if (!relationship) return NextResponse.json({ message: 'Request not found' }, { status: 404 })

    const conversation = await Conversation.create({
      participants: [relationship.userId, trainer.userId],
      relationshipId: relationship._id,
    })

    relationship.status = 'active'
    relationship.conversationId = conversation._id
    relationship.canChat = true
    relationship.canViewProgress = true
    relationship.canEditSchedule = true
    relationship.canViewNutrition = true
    relationship.canCreateWorkouts = true
    await relationship.save()

    await Trainer.updateOne({ _id: trainer._id }, { $inc: { totalClients: 1 } })

    const gamification = await awardXp(
      relationship.userId.toString(),
      XP_REWARDS.trainer_connected,
    )

    return NextResponse.json({
      message: 'Client accepted',
      relationship,
      conversationId: conversation._id,
      clientXpAwarded: XP_REWARDS.trainer_connected,
      gamification,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
