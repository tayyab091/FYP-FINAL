import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Message from '@/models/Message'
import Conversation from '@/models/Conversation'
import User from '@/models/User'
import Relationship from '@/models/Relationship'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    await connectDB()
    const conversation = await Conversation.findOne({
      _id: id,
      participants: tokenUser.userId,
    }).select('_id participants relationshipId')
    if (!conversation) {
      return NextResponse.json({ message: 'Conversation not found' }, { status: 404 })
    }
    const relationship = await Relationship.findOne({
      _id: conversation.relationshipId,
      status: 'active',
      canChat: true,
    }).select('_id')
    if (!relationship) {
      return NextResponse.json({ message: 'Chat is not available' }, { status: 403 })
    }

    const messages = await Message.find({ conversationId: id })
      .populate('attachedPlanId')
      .sort({ createdAt: 1 })
      .lean()
    const shaped = messages.map((message) => ({
      ...message,
      attachedPlan: message.attachedPlanId || undefined,
    }))
    await Conversation.updateOne(
      { _id: conversation._id },
      { $set: { [`unreadCounts.${tokenUser.userId}`]: 0 } },
    )
    return NextResponse.json(shaped)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const { content, type = 'text' } = await req.json()
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ message: 'Message cannot be empty' }, { status: 400 })
    }
    if (content.length > 2000) {
      return NextResponse.json({ message: 'Message is too long' }, { status: 400 })
    }
    if (!['text', 'workout_plan', 'image'].includes(type)) {
      return NextResponse.json({ message: 'Invalid message type' }, { status: 400 })
    }

    await connectDB()
    const conversation = await Conversation.findOne({
      _id: id,
      participants: tokenUser.userId,
    })
    if (!conversation) {
      return NextResponse.json({ message: 'Conversation not found' }, { status: 404 })
    }
    const relationship = await Relationship.findOne({
      _id: conversation.relationshipId,
      status: 'active',
      canChat: true,
    }).select('_id')
    if (!relationship) {
      return NextResponse.json({ message: 'Chat is not available' }, { status: 403 })
    }

    const user = await User.findById(tokenUser.userId).select('fullName')
    const message = await Message.create({
      conversationId: id,
      senderId: tokenUser.userId,
      senderName: user?.fullName || 'User',
      content: content.trim(),
      type,
    })

    // Update conversation last message
    const unreadIncrements = Object.fromEntries(
      conversation.participants
        .map((participantId: { toString(): string }) => participantId.toString())
        .filter((participantId: string) => participantId !== tokenUser.userId)
        .map((participantId: string) => [`unreadCounts.${participantId}`, 1]),
    )
    await Conversation.findByIdAndUpdate(conversation._id, {
      $set: {
        lastMessage: content.trim().slice(0, 100),
        lastMessageTime: new Date(),
      },
      ...(Object.keys(unreadIncrements).length > 0 && { $inc: unreadIncrements }),
    })

    return NextResponse.json(message, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
