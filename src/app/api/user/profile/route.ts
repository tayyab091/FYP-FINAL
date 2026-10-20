import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import { getUser } from '@/lib/auth'
import { parseJsonBody, profileUpdateSchema } from '@/lib/validation'

export async function PUT(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const parsed = await parseJsonBody(req, profileUpdateSchema)
    if ('error' in parsed) return parsed.error

    const data = parsed.data
    await connectDB()

    const update: Record<string, unknown> = { fullName: data.fullName }
    if (data.country !== undefined) update.country = data.country
    if (data.profileImage !== undefined) update.profileImage = data.profileImage
    if (data.bio !== undefined) update.bio = data.bio
    if (data.currentWeight !== undefined) update.currentWeight = data.currentWeight
    if (data.targetWeight !== undefined) update.targetWeight = data.targetWeight
    if (data.fitnessGoal !== undefined) update.fitnessGoal = data.fitnessGoal
    if (data.activityLevel !== undefined) update.activityLevel = data.activityLevel
    if (data.goalMetricCurrent !== undefined) update.goalMetricCurrent = data.goalMetricCurrent
    if (data.goalMetricTarget !== undefined) update.goalMetricTarget = data.goalMetricTarget
    if (data.goalMetricUnit !== undefined) update.goalMetricUnit = data.goalMetricUnit

    const user = await User.findByIdAndUpdate(tokenUser.userId, update, {
      new: true,
      runValidators: true,
    }).select('-password')

    if (tokenUser.role === 'trainer') {
      const trainerUpdate: Record<string, unknown> = {}
      if (data.fullName !== undefined) trainerUpdate.name = data.fullName
      if (data.country !== undefined) trainerUpdate.country = data.country
      if (data.profileImage !== undefined) trainerUpdate.profileImage = data.profileImage
      if (data.bio !== undefined) trainerUpdate.bio = data.bio
      if (Object.keys(trainerUpdate).length > 0) {
        await Trainer.findOneAndUpdate({ userId: tokenUser.userId }, trainerUpdate, {
          runValidators: true,
        })
      }
    }

    return NextResponse.json({ user, message: 'Profile updated' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
