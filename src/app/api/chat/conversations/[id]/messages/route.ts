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
    const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 }).lean()
    return NextResponse.json(messages)
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
    if (!content?.trim()) return NextResponse.json({ message: 'Message cannot be empty' }, { status: 400 })

    await connectDB()
    const user = await User.findById(tokenUser.userId).select('fullName')
    const message = await Message.create({
      conversationId: id,
      senderId: tokenUser.userId,
      senderName: user?.fullName || 'User',
      content: content.trim(),
      type,
    })

    // Update conversation last message
    await Conversation.findByIdAndUpdate(id, {
      lastMessage: content.trim().slice(0, 100),
      lastMessageTime: new Date(),
    })

    return NextResponse.json(message, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
