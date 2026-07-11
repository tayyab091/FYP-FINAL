import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { getUser } from '@/lib/auth'

export async function PUT(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    await connectDB()
    const { fullName, country, profileImage, bio, currentWeight, targetWeight, fitnessGoal, activityLevel } = await req.json()
    if (typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json({ message: 'Full name must be at least 2 characters' }, { status: 400 })
    }
    const user = await User.findByIdAndUpdate(
      tokenUser.userId,
      {
        fullName: fullName.trim(),
        country,
        profileImage,
        bio,
        currentWeight,
        targetWeight,
        fitnessGoal,
        activityLevel,
      },
      { new: true, runValidators: true }
    ).select('-password')
    return NextResponse.json({ user, message: 'Profile updated' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
