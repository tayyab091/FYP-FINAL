import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Gym from '@/models/Gym'
import Trainer from '@/models/Trainer'
import User from '@/models/User'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser || tokenUser.role !== 'gym_owner') return NextResponse.json({ message: 'Not authorized' }, { status: 403 })
    await connectDB()
    const gym = await Gym.findOne({ ownerId: tokenUser.userId })
    if (!gym) return NextResponse.json([])
    const trainers = await Trainer.find({ gymId: gym._id }).lean()
    return NextResponse.json(trainers)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser || tokenUser.role !== 'gym_owner') return NextResponse.json({ message: 'Not authorized' }, { status: 403 })
    await connectDB()
    const { trainerEmail } = await req.json()
    const gym = await Gym.findOne({ ownerId: tokenUser.userId })
    if (!gym) return NextResponse.json({ message: 'Gym not found' }, { status: 404 })
    const trainerUser = await User.findOne({ email: trainerEmail, role: 'trainer' })
    if (!trainerUser) return NextResponse.json({ message: 'Trainer not found with this email' }, { status: 404 })
    const trainer = await Trainer.findOneAndUpdate(
      { userId: trainerUser._id },
      { gymId: gym._id, gymName: gym.name, gymVerificationStatus: 'approved' },
      { new: true }
    )
    return NextResponse.json({ message: 'Trainer added to gym', trainer })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
