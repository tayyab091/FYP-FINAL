import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Message from '@/models/Message'
import Conversation from '@/models/Conversation'
import User from '@/models/User'
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
    }).select('_id')
    if (!conversation) {
      return NextResponse.json({ message: 'Conversation not found' }, { status: 404 })
    }

    const messages = await Message.find({ conversationId: id })
      .populate('attachedPlanId')
      .sort({ createdAt: 1 })
      .lean()
    const shaped = messages.map((message) => ({
      ...message,
      attachedPlan: message.attachedPlanId || undefined,
    }))
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

    const user = await User.findById(tokenUser.userId).select('fullName')
    const message = await Message.create({
      conversationId: id,
      senderId: tokenUser.userId,
      senderName: user?.fullName || 'User',
      content: content.trim(),
      type,
    })

    // Update conversation last message
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: content.trim().slice(0, 100),
      lastMessageTime: new Date(),
    })

    return NextResponse.json(message, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
