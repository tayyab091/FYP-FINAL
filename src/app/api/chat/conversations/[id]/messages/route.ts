import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Message from '@/models/Message'
import Conversation from '@/models/Conversation'
import { getUser } from '@/lib/auth'
import { createMessage, ChatError, assertCanChat } from '@/lib/chat/createMessage'
import { publishChatMessage } from '@/lib/realtime'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    await connectDB()
    await assertCanChat(id, tokenUser.userId)

    const messages = await Message.find({ conversationId: id })
      .populate('attachedPlanId')
      .sort({ createdAt: 1 })
      .lean()
    const shaped = messages.map((message) => ({
      ...message,
      attachedPlan: message.attachedPlanId || undefined,
    }))
    await Conversation.updateOne(
      { _id: id },
      { $set: { [`unreadCounts.${tokenUser.userId}`]: 0 } },
    )
    return NextResponse.json(shaped)
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const { content, type = 'text', attachedPlanId } = await req.json()

    const saved = await createMessage({
      conversationId: id,
      sender: tokenUser,
      content,
      type,
      attachedPlanId,
    })

    await publishChatMessage(id, saved).catch(() => {})

    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
