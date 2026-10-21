import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Relationship from '@/models/Relationship'
import { getUser } from '@/lib/auth'

interface LeanConversation {
  relationshipId?: { toString(): string }
  unreadCounts?: Record<string, number> | Map<string, number>
}

/**
 * Cheap counterpart to GET /api/chat/conversations, used by FloatingChat's
 * unread badge, which previously called the full endpoint (populated
 * participants, lastMessage, etc.) on every single page navigation just to
 * sum unreadCount. This skips populate entirely and only selects the two
 * fields needed to compute the badge total.
 */
export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()
    const conversations = await Conversation.find({ participants: tokenUser.userId })
      .select('relationshipId unreadCounts')
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

    const count = (conversations as unknown as LeanConversation[]).reduce((sum, c) => {
      if (!c.relationshipId || !allowedRelationshipIds.has(c.relationshipId.toString())) return sum
      const mine = c.unreadCounts instanceof Map
        ? c.unreadCounts.get(tokenUser.userId)
        : c.unreadCounts?.[tokenUser.userId]
      return sum + (mine || 0)
    }, 0)

    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
