import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
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

    const user = await User.findByIdAndUpdate(tokenUser.userId, update, {
      new: true,
      runValidators: true,
    }).select('-password')

    return NextResponse.json({ user, message: 'Profile updated' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
