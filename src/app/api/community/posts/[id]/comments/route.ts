import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
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

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid post id' }, { status: 400 })
    }

    await connectDB()
    const post = await CommunityPost.findById(id).select('_id').lean()
    if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 })

    const comments = await CommunityComment.find({ postId: id })
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

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid post id' }, { status: 400 })
    }

    const body = await req.json() as { content?: string }
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!content) {
      return NextResponse.json({ message: 'Comment content is required' }, { status: 400 })
    }
    if (content.length > 1000) {
      return NextResponse.json({ message: 'Comment is too long (max 1000 characters)' }, { status: 400 })
    }

    await connectDB()
    const post = await CommunityPost.findById(id).select('_id').lean()
    if (!post) return NextResponse.json({ message: 'Post not found' }, { status: 404 })

    const user = await User.findById(tokenUser.userId).select('fullName').lean()
    const authorName = user?.fullName || tokenUser.email

    const comment = await CommunityComment.create({
      postId: id,
      authorId: tokenUser.userId,
      authorName,
      content,
    })

    return NextResponse.json(comment, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
