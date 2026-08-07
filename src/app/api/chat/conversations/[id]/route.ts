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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    await connectDB()

    const conversation = await Conversation.findOne({
      _id: id,
      participants: tokenUser.userId,
    })
      .populate('participants', USER_AVATAR_POPULATE_SELECT)
      .lean()

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

    const participants = conversation.participants as unknown as PopulatedParticipant[]
    const other = participants?.find(
      (participant) => participant._id.toString() !== tokenUser.userId,
    )

    return NextResponse.json({
      _id: conversation._id,
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
      lastMessage: conversation.lastMessage || '',
      lastMessageTime: conversation.lastMessageTime || conversation.updatedAt,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
