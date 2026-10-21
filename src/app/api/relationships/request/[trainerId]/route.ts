import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Relationship from '@/models/Relationship'
import Trainer from '@/models/Trainer'
import User from '@/models/User'
import { getUser } from '@/lib/auth'
import { getTrainerConnectionLimit, normalizePlan } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import { createNotification } from '@/lib/notifications'
import { findTrainerByIdOrSlug } from '@/lib/resolve-trainer'

export async function POST(req: NextRequest, { params }: { params: Promise<{ trainerId: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const { trainerId: trainerRef } = await params
    await connectDB()

    // Check subscription
    const user = await User.findById(tokenUser.userId)
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const subscription = await syncUserSubscription(tokenUser.userId)
    const plan = normalizePlan(subscription?.plan)
    const connectionLimit = getTrainerConnectionLimit(plan)
    if (Number.isFinite(connectionLimit) && user.freeChatsUsed >= connectionLimit) {
      return NextResponse.json({ message: 'Upgrade your plan to connect with more trainers' }, { status: 403 })
    }

    const resolvedTrainer = await findTrainerByIdOrSlug(trainerRef)
    if (!resolvedTrainer || !resolvedTrainer.isFullyVerified || !resolvedTrainer.isActive) {
      return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })
    }
    const trainer = await Trainer.findById(resolvedTrainer._id)
    if (!trainer) return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })
    const trainerId = trainer._id.toString()

    const existing = await Relationship.findOne({ userId: tokenUser.userId, trainerId })
    if (existing) {
      return NextResponse.json({ message: 'Request already sent', status: existing.status }, { status: 409 })
    }

    const relationship = await Relationship.create({
      userId: tokenUser.userId,
      trainerId,
      status: 'pending',
    })
    if (plan === 'basic') {
      await User.updateOne(
        { _id: tokenUser.userId },
        { $inc: { freeChatsUsed: 1 } },
      )
    }

    await createNotification({
      userId: trainer.userId,
      title: 'New connection request',
      message: `${user.fullName} wants to connect with you as a client.`,
      type: 'trainer',
      link: '/trainer-dashboard',
    })

    return NextResponse.json({ message: 'Connection request sent', relationship }, { status: 201 })
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
