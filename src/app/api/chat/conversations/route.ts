import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Relationship from '@/models/Relationship'
import { getUser } from '@/lib/auth'
import { USER_AVATAR_POPULATE_SELECT, resolveAvatarUrl } from '@/lib/avatar'

interface PopulatedParticipant {
  _id: { toString(): string }
  fullName: string
  email: string
  profileImage?: string
  avatarUrl?: string
  role: string
}

interface LeanConversation {
  _id: unknown
  participants?: PopulatedParticipant[]
  lastMessage?: string
  lastMessageTime?: Date
  updatedAt?: Date
  unreadCounts?: Record<string, number> | Map<string, number>
}

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()
    const conversationRefs = await Conversation.find({
      participants: tokenUser.userId,
    }).select('relationshipId').lean()
    const relationshipIds = await Relationship.find({
      _id: { $in: conversationRefs.map((conversation) => conversation.relationshipId) },
      status: 'active',
      canChat: true,
    }).distinct('_id')

    const conversations = await Conversation.find({
      participants: tokenUser.userId,
      relationshipId: { $in: relationshipIds },
    })
      .populate('participants', USER_AVATAR_POPULATE_SELECT)
      .sort({ updatedAt: -1 })
      .lean()

    // Shape for frontend — show the other participant
    const shaped = (conversations as unknown as LeanConversation[]).map((c) => {
      const other = c.participants?.find((participant) => participant._id.toString() !== tokenUser.userId)
      const unreadCount = c.unreadCounts instanceof Map
        ? c.unreadCounts.get(tokenUser.userId)
        : c.unreadCounts?.[tokenUser.userId]
      return {
        _id: c._id,
        otherUser: other
          ? {
              _id: other._id.toString(),
              fullName: other.fullName,
              email: other.email,
              profileImage: resolveAvatarUrl(other) || other.profileImage,
              avatarUrl: resolveAvatarUrl(other) || '',
              role: other.role,
            }
          : { _id: '', fullName: 'Unknown', email: '', role: 'user' },
        lastMessage: c.lastMessage || '',
        lastMessageTime: c.lastMessageTime || c.updatedAt,
        unreadCount: unreadCount || 0,
      }
    })

    return NextResponse.json(shaped)
  } catch (error) {
    console.error('Conversations error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
