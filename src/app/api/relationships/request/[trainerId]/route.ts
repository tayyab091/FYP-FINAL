import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Relationship from '@/models/Relationship'
import Trainer from '@/models/Trainer'
import User from '@/models/User'
import { getUser } from '@/lib/auth'
import mongoose from 'mongoose'

export async function POST(req: NextRequest, { params }: { params: Promise<{ trainerId: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const { trainerId } = await params
    if (!mongoose.isValidObjectId(trainerId)) {
      return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })
    }
    await connectDB()

    // Check subscription
    const user = await User.findById(tokenUser.userId)
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    if (user.subscription.plan === 'basic' && user.freeChatsUsed >= 5) {
      return NextResponse.json({ message: 'Upgrade your plan to connect with more trainers' }, { status: 403 })
    }

    const trainer = await Trainer.findOne({
      _id: trainerId,
      isFullyVerified: true,
      isActive: true,
    })
    if (!trainer) return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })

    const existing = await Relationship.findOne({ userId: tokenUser.userId, trainerId })
    if (existing) {
      return NextResponse.json({ message: 'Request already sent', status: existing.status }, { status: 409 })
    }

    const relationship = await Relationship.create({
      userId: tokenUser.userId,
      trainerId,
      status: 'pending',
    })

    return NextResponse.json({ message: 'Connection request sent', relationship }, { status: 201 })
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
