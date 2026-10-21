import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import Relationship from '@/models/Relationship'
import Conversation from '@/models/Conversation'
import Message from '@/models/Message'
import MealLog from '@/models/MealLog'
import WorkoutPlan from '@/models/WorkoutPlan'
import WorkoutLog from '@/models/WorkoutLog'
import ProgressRecord from '@/models/ProgressRecord'
import Notification from '@/models/Notification'
import GamificationProfile from '@/models/GamificationProfile'
import CommunityPost from '@/models/CommunityPost'
import CommunityComment from '@/models/CommunityComment'
import { getUser, cookieOptions } from '@/lib/auth'

export async function DELETE(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()
    const userId = tokenUser.userId

    const trainer = await Trainer.findOne({ userId }).select('_id')
    const trainerId = trainer?._id

    const conversations = await Conversation.find({ participants: userId }).select('_id').lean()
    const conversationIds = conversations.map((c) => c._id)

    await Promise.all([
      Message.deleteMany({
        $or: [{ senderId: userId }, { conversationId: { $in: conversationIds } }],
      }),
      Conversation.deleteMany({ _id: { $in: conversationIds } }),
      Relationship.deleteMany({
        $or: [{ userId }, ...(trainerId ? [{ trainerId }] : [])],
      }),
      trainerId ? Trainer.deleteOne({ _id: trainerId }) : Promise.resolve(),
      MealLog.deleteMany({ userId }),
      WorkoutPlan.deleteMany({ userId }),
      WorkoutLog.deleteMany({ userId }),
      ProgressRecord.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      GamificationProfile.deleteMany({ userId }),
      CommunityPost.deleteMany({ authorId: userId }),
      CommunityComment.deleteMany({ authorId: userId }),
      User.findByIdAndDelete(userId),
    ])

    const response = NextResponse.json({ message: 'Account deleted successfully' })
    response.cookies.set('token', '', { ...cookieOptions(), maxAge: 0 })
    return response
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
