import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import { normalizePlan, canAccessCommunity } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import { publishCommunityNewPost } from '@/lib/realtime'
import CommunityPost from '@/models/CommunityPost'
import { COMMUNITY_POST_CATEGORIES } from '@/lib/community'
import CommunityComment from '@/models/CommunityComment'
import User from '@/models/User'
import { communityPostSchema, parseJsonBody } from '@/lib/validation'
import mongoose from 'mongoose'
import { USER_AVATAR_POPULATE_SELECT, resolveAvatarUrl } from '@/lib/avatar'
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
  category: z.enum(COMMUNITY_POST_CATEGORIES).optional(),
  sort: z.enum(['newest', 'liked', 'commented']).optional().default('newest'),
  search: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim().slice(0, 100) : undefined)),
  mine: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  liked: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function postSortTime(value: string | Date | undefined): number {
  if (!value) return 0
  return new Date(value).getTime()
}

function shapePost(
  post: {
    _id: { toString(): string }
    authorId: unknown
    authorName?: string
    content?: string
    category?: string
    likes?: { toString(): string }[]
    createdAt?: Date | string
    updatedAt?: Date | string
  },
  tokenUserId: string,
  commentCount = 0,
) {
  const author =
    post.authorId && typeof post.authorId === 'object' && 'fullName' in post.authorId
      ? (post.authorId as {
          _id?: { toString(): string }
          fullName?: string
          profileImage?: string
          avatarUrl?: string
          role?: string
        })
      : null

  const authorId =
    author?._id?.toString() ||
    (typeof post.authorId === 'object' &&
    post.authorId &&
    'toString' in post.authorId
      ? (post.authorId as { toString(): string }).toString()
      : String(post.authorId))

  return {
    _id: post._id.toString(),
    authorId,
    authorName: author?.fullName || post.authorName || 'Member',
    authorImage: resolveAvatarUrl(author) || author?.profileImage || '',
    authorRole: author?.role || 'user',
    content: post.content,
    category: post.category || 'Motivation',
    likeCount: post.likes?.length || 0,
    likedByMe: (post.likes || []).some((id) => id.toString() === tokenUserId),
    commentCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }
}

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertCommunityAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const query = parseSearchParams(req.nextUrl.searchParams, listQuerySchema)
    if ('error' in query) return query.error

    await connectDB()

    const filters: Record<string, unknown> = {}
    if (query.data.category) filters.category = query.data.category
    if (query.data.mine) filters.authorId = new mongoose.Types.ObjectId(tokenUser.userId)
    if (query.data.liked) filters.likes = new mongoose.Types.ObjectId(tokenUser.userId)
    if (query.data.search) {
      const pattern = new RegExp(escapeRegex(query.data.search), 'i')
      filters.$or = [{ content: pattern }, { authorName: pattern }]
    }

    const fetchLimit =
      query.data.sort === 'newest' ? query.data.limit : Math.min(50, query.data.limit * 3)

    const posts = await CommunityPost.find(filters)
      .populate('authorId', USER_AVATAR_POPULATE_SELECT)
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .lean()

    const postIds = posts.map((p) => p._id)
    const commentCounts = await CommunityComment.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } },
    ])
    const countMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count as number]))

    let shaped = posts.map((post) =>
      shapePost(post, tokenUser.userId, countMap.get(post._id.toString()) || 0),
    )

    if (query.data.sort === 'liked') {
      shaped.sort(
        (a, b) =>
          b.likeCount - a.likeCount || postSortTime(b.createdAt) - postSortTime(a.createdAt),
      )
    } else if (query.data.sort === 'commented') {
      shaped.sort(
        (a, b) =>
          b.commentCount - a.commentCount ||
          postSortTime(b.createdAt) - postSortTime(a.createdAt),
      )
    }

    shaped = shaped.slice(0, query.data.limit)

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
    const user = await User.findById(tokenUser.userId)
      .select(USER_AVATAR_POPULATE_SELECT)
      .lean()
    const authorName = user?.fullName || tokenUser.email

    const post = await CommunityPost.create({
      authorId: tokenUser.userId,
      authorName,
      content: parsed.data.content,
      category: parsed.data.category,
      likes: [],
    })

    const shaped = {
      _id: post._id.toString(),
      authorId: tokenUser.userId,
      authorName,
      authorImage: resolveAvatarUrl(user) || user?.profileImage || '',
      authorRole: user?.role || tokenUser.role || 'user',
      content: post.content,
      category: post.category || parsed.data.category,
      likeCount: 0,
      likedByMe: false,
      commentCount: 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }

    await publishCommunityNewPost(shaped).catch(() => {})

    return NextResponse.json(shaped, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
