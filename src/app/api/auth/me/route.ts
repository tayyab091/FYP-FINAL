import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { getUser } from '@/lib/auth'
import { syncUserSubscription } from '@/lib/subscription-server'
import { calculateDailyCalories } from '@/lib/nutrition'
import { resolveAvatarUrl } from '@/lib/avatar'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    await connectDB()
    const subscription = await syncUserSubscription(tokenUser.userId)
    const user = await User.findById(tokenUser.userId).select('-password').lean()
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const calorieGoal = user.role === 'user'
      ? calculateDailyCalories({
          currentWeight: user.currentWeight,
          targetWeight: user.targetWeight,
          fitnessGoal: user.fitnessGoal,
          activityLevel: user.activityLevel,
        })
      : undefined

    const avatarUrl = resolveAvatarUrl(user) || ''

    return NextResponse.json({
      user: {
        ...user,
        id: user._id.toString(),
        avatarUrl,
        profileImage: avatarUrl || user.profileImage,
        subscription: subscription ?? user.subscription,
        calorieGoal,
      },
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
