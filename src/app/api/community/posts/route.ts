import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import { normalizePlan, canAccessCommunity } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import CommunityPost from '@/models/CommunityPost'
import CommunityComment from '@/models/CommunityComment'
import User from '@/models/User'
import { communityPostSchema, parseJsonBody } from '@/lib/validation'
import { z } from 'zod'
import { parseSearchParams } from '@/lib/validation'

async function assertCommunityAccess(userId: string, role: string) {
  if (bypassesSubscriptionGate(role)) return null
  const subscription = await syncUserSubscription(userId)
  if (!subscription || subscription.status === 'inactive') {
    return NextResponse.json({ message: 'Active subscription required' }, { status: 403 })
  }
  if (!canAccessCommunity(normalizePlan(subscription.plan))) {
    return NextResponse.json({ message: 'Community requires Basic plan or higher' }, { status: 403 })
  }
  return null
}

const listQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = parseInt(v || '20', 10)
      if (!Number.isFinite(n)) return 20
      return Math.min(50, Math.max(1, n))
    }),
})

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertCommunityAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const query = parseSearchParams(req.nextUrl.searchParams, listQuerySchema)
    if ('error' in query) return query.error

    await connectDB()
    const posts = await CommunityPost.find({})
      .populate('authorId', 'fullName profileImage role')
      .sort({ createdAt: -1 })
      .limit(query.data.limit)
      .lean()

    const postIds = posts.map((p) => p._id)
    const commentCounts = await CommunityComment.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } },
    ])
    const countMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count as number]))

    const shaped = posts.map((post) => {
      const author =
        post.authorId && typeof post.authorId === 'object' && 'fullName' in post.authorId
          ? (post.authorId as { fullName?: string; profileImage?: string; role?: string })
          : null
      return {
        ...post,
        authorName: author?.fullName || post.authorName,
        authorImage: author?.profileImage,
        authorRole: author?.role,
        likeCount: post.likes?.length || 0,
        likedByMe: (post.likes || []).some(
          (id: { toString(): string }) => id.toString() === tokenUser.userId,
        ),
        commentCount: countMap.get(post._id.toString()) || 0,
      }
    })

    return NextResponse.json(shaped)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertCommunityAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const parsed = await parseJsonBody(req, communityPostSchema)
    if ('error' in parsed) return parsed.error

    await connectDB()
    const user = await User.findById(tokenUser.userId).select('fullName').lean()
    const authorName = user?.fullName || tokenUser.email

    const post = await CommunityPost.create({
      authorId: tokenUser.userId,
      authorName,
      content: parsed.data.content,
      likes: [],
    })

    return NextResponse.json({
      ...post.toObject(),
      likeCount: 0,
      likedByMe: false,
      commentCount: 0,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
