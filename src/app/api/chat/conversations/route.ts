import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()
    const conversations = await Conversation.find({ participants: tokenUser.userId })
      .populate('participants', 'fullName email profileImage role')
      .sort({ updatedAt: -1 })
      .lean()

    // Shape for frontend — show the other participant
    const shaped = conversations.map((c: any) => {
      const other = c.participants?.find((p: any) => p._id.toString() !== tokenUser.userId)
      return {
        _id: c._id,
        otherUser: other || { fullName: 'Unknown', email: '' },
        lastMessage: c.lastMessage || '',
        lastMessageTime: c.lastMessageTime || c.updatedAt,
        unreadCount: (c.unreadCounts as any)?.[tokenUser.userId] || 0,
      }
    })

    return NextResponse.json(shaped)
  } catch (error) {
    console.error('Conversations error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
