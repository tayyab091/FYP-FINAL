import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Relationship from '@/models/Relationship'
import { getUser } from '@/lib/auth'

interface PopulatedParticipant {
  _id: { toString(): string }
  fullName: string
  email: string
  profileImage?: string
  role: string
}

interface LeanConversation {
  _id: unknown
  relationshipId?: { toString(): string }
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
    // This route runs on every authenticated page load (FloatingChat's unread
    // badge), so the previous 3-sequential-round-trip version — fetch
    // conversation refs, then fetch allowed relationship ids, then re-fetch
    // the same conversations again with populate — cost 3x the DB latency
    // for what only needs 2 queries: fetch the conversations once (with
    // populate), then filter by which of their relationships are still
    // active+chattable.
    const conversations = await Conversation.find({
      participants: tokenUser.userId,
    })
      .populate('participants', 'fullName email profileImage role')
      .sort({ updatedAt: -1 })
      .lean()

    const relationshipIds = (conversations as unknown as LeanConversation[])
      .map((c) => c.relationshipId)
      .filter(Boolean)
    const allowedRelationshipIds = new Set(
      (
        await Relationship.find({
          _id: { $in: relationshipIds },
          status: 'active',
          canChat: true,
        }).distinct('_id')
      ).map((id) => id.toString()),
    )

    // Shape for frontend — show the other participant
    const shaped = (conversations as unknown as LeanConversation[])
      .filter((c) => c.relationshipId && allowedRelationshipIds.has(c.relationshipId.toString()))
      .map((c) => {
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
                profileImage: other.profileImage,
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
