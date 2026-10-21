import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import { normalizePlan, canAccessCommunity } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import { createNotification } from '@/lib/notifications'
import { publishCommunityPostLiked } from '@/lib/realtime'
import CommunityPost from '@/models/CommunityPost'
import User from '@/models/User'
import { parseObjectIdParam } from '@/lib/validation'

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

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertCommunityAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'post id')
    if ('error' in idResult) return idResult.error
    const id = idResult.id

    await connectDB()
    const post = await CommunityPost.findById(id)
    if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 })

    const userObjectId = new mongoose.Types.ObjectId(tokenUser.userId)
    const alreadyLiked = post.likes.some(
      (likeId: mongoose.Types.ObjectId) => likeId.toString() === tokenUser.userId,
    )

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (likeId: mongoose.Types.ObjectId) => likeId.toString() !== tokenUser.userId,
      )
    } else {
      post.likes.push(userObjectId)
    }

    await post.save()

    if (!alreadyLiked && post.authorId.toString() !== tokenUser.userId) {
      const liker = await User.findById(tokenUser.userId).select('fullName').lean()
      await createNotification({
        userId: post.authorId,
        title: 'New like on your post',
        message: `${liker?.fullName || 'Someone'} liked your community post`,
        type: 'community',
        link: '/community',
      }).catch(() => {})
    }

    const payload = {
      postId: id,
      likedByMe: !alreadyLiked,
      likeCount: post.likes.length,
    }

    await publishCommunityPostLiked(payload).catch(() => {})

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
