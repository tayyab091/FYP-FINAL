import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Relationship from '@/models/Relationship'
import Conversation from '@/models/Conversation'
import Trainer from '@/models/Trainer'
import { getUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    await connectDB()

    const relationship = await Relationship.findById(id)
    if (!relationship) return NextResponse.json({ message: 'Request not found' }, { status: 404 })

    // Create conversation
    const trainer = await Trainer.findById(relationship.trainerId)
    const conversation = await Conversation.create({
      participants: [relationship.userId, trainer?.userId],
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

    return NextResponse.json({ message: 'Client accepted', relationship, conversationId: conversation._id })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
