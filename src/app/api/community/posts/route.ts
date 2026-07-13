import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import {
  syncUserSubscription,
  normalizePlan,
  canAccessCommunity,
} from '@/lib/subscription'
import CommunityPost from '@/models/CommunityPost'
import CommunityComment from '@/models/CommunityComment'
import User from '@/models/User'

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

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertCommunityAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    await connectDB()
    const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20', 10) || 20))

    const posts = await CommunityPost.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const postIds = posts.map((p) => p._id)
    const commentCounts = await CommunityComment.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } },
    ])
    const countMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count as number]))

    const shaped = posts.map((post) => ({
      ...post,
      likeCount: post.likes?.length || 0,
      likedByMe: (post.likes || []).some(
        (id: { toString(): string }) => id.toString() === tokenUser.userId,
      ),
      commentCount: countMap.get(post._id.toString()) || 0,
    }))

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

    const body = await req.json() as { content?: string }
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!content) {
      return NextResponse.json({ message: 'Post content is required' }, { status: 400 })
    }
    if (content.length > 2000) {
      return NextResponse.json({ message: 'Post is too long (max 2000 characters)' }, { status: 400 })
    }

    await connectDB()
    const user = await User.findById(tokenUser.userId).select('fullName').lean()
    const authorName = user?.fullName || tokenUser.email

    const post = await CommunityPost.create({
      authorId: tokenUser.userId,
      authorName,
      content,
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
