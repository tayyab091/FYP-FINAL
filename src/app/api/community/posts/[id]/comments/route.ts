import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import { normalizePlan, canAccessCommunity } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import { createNotification } from '@/lib/notifications'
import CommunityPost from '@/models/CommunityPost'
import CommunityComment from '@/models/CommunityComment'
import User from '@/models/User'
import { communityCommentSchema, parseJsonBody, parseObjectIdParam } from '@/lib/validation'

type RouteContext = { params: Promise<{ id: string }> }

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

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertCommunityAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'post id')
    if ('error' in idResult) return idResult.error

    await connectDB()
    const post = await CommunityPost.findById(idResult.id).select('_id').lean()
    if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 })

    const comments = await CommunityComment.find({ postId: idResult.id })
      .sort({ createdAt: 1 })
      .lean()

    return NextResponse.json(comments)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertCommunityAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'post id')
    if ('error' in idResult) return idResult.error

    const parsed = await parseJsonBody(req, communityCommentSchema)
    if ('error' in parsed) return parsed.error

    await connectDB()
    const post = await CommunityPost.findById(idResult.id).select('_id authorId').lean()
    if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 })

    const user = await User.findById(tokenUser.userId).select('fullName').lean()
    const authorName = user?.fullName || tokenUser.email

    const comment = await CommunityComment.create({
      postId: idResult.id,
      authorId: tokenUser.userId,
      authorName,
      content: parsed.data.content,
    })

    if (post.authorId.toString() !== tokenUser.userId) {
      await createNotification({
        userId: post.authorId,
        title: 'New comment on your post',
        message: `${authorName} commented on your community post`,
        type: 'community',
        link: '/community',
      }).catch(() => {})
    }

    return NextResponse.json(comment, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
