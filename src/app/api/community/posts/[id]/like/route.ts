import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import { normalizePlan, canAccessCommunity } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import CommunityPost from '@/models/CommunityPost'

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

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid post id' }, { status: 400 })
    }

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

    return NextResponse.json({
      likedByMe: !alreadyLiked,
      likeCount: post.likes.length,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
