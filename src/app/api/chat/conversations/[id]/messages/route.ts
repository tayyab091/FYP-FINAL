import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Message from '@/models/Message'
import Conversation from '@/models/Conversation'
import { getUser } from '@/lib/auth'
import { createMessage, ChatError, assertCanChat } from '@/lib/chat/createMessage'
import { publishChatMessage } from '@/lib/realtime'
import { chatMessageSchema, parseJsonBody, parseObjectIdParam } from '@/lib/validation'
import { sanitizePlainText, isSafeHttpUrl } from '@/lib/sanitize'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'conversation id')
    if ('error' in idResult) return idResult.error

    await connectDB()
    await assertCanChat(idResult.id, tokenUser.userId)

    const messages = await Message.find({ conversationId: idResult.id })
      .populate('attachedPlanId')
      .sort({ createdAt: 1 })
      .lean()
    const shaped = messages.map((message) => ({
      ...message,
      attachedPlan: message.attachedPlanId || undefined,
    }))
    await Conversation.updateOne(
      { _id: idResult.id },
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

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'conversation id')
    if ('error' in idResult) return idResult.error

    const parsed = await parseJsonBody(req, chatMessageSchema)
    if ('error' in parsed) return parsed.error

    const { content, type, attachedPlanId } = parsed.data
    let safeContent = content
    if (type === 'image') {
      if (!isSafeHttpUrl(content, true)) {
        return NextResponse.json(
          { message: 'Image content must be a valid https URL' },
          { status: 400 },
        )
      }
      safeContent = content.trim()
    } else {
      safeContent = sanitizePlainText(content, 2000)
      if (!safeContent) {
        return NextResponse.json({ message: 'Message cannot be empty' }, { status: 400 })
      }
    }

    const saved = await createMessage({
      conversationId: idResult.id,
      sender: tokenUser,
      content: safeContent,
      type,
      attachedPlanId,
    })

    await publishChatMessage(idResult.id, saved).catch(() => {})

    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    if (error instanceof ChatError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
