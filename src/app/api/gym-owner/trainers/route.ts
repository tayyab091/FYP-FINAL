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
    const normalizedEmail = typeof trainerEmail === 'string' ? trainerEmail.trim().toLowerCase() : ''
    if (!normalizedEmail) {
      return NextResponse.json({ message: 'Trainer email is required' }, { status: 400 })
    }
    const trainerUser = await User.findOne({ email: normalizedEmail, role: 'trainer' })
    if (!trainerUser) return NextResponse.json({ message: 'Trainer not found with this email' }, { status: 404 })
    const existingTrainer = await Trainer.findOne({ userId: trainerUser._id })
    if (!existingTrainer) return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })
    if (existingTrainer.gymId && existingTrainer.gymId.toString() !== gym._id.toString()) {
      return NextResponse.json({ message: 'Trainer already belongs to another gym' }, { status: 409 })
    }

    const trainer = await Trainer.findOneAndUpdate(
      { userId: trainerUser._id },
      {
        gymId: gym._id,
        gymName: gym.name,
        gymVerificationStatus: 'approved',
        isFullyVerified: existingTrainer.adminVerificationStatus === 'approved',
      },
      { new: true }
    )
    if (trainer) {
      await Gym.updateOne({ _id: gym._id }, { $addToSet: { trainers: trainer._id } })
    }
    return NextResponse.json({ message: 'Trainer added to gym', trainer })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser || tokenUser.role !== 'gym_owner') {
      return NextResponse.json({ message: 'Not authorized' }, { status: 403 })
    }

    const { trainerId, action } = await req.json()
    if (!trainerId || !['approve', 'remove'].includes(action)) {
      return NextResponse.json({ message: 'Valid trainer and action are required' }, { status: 400 })
    }

    await connectDB()
    const gym = await Gym.findOne({ ownerId: tokenUser.userId })
    if (!gym) return NextResponse.json({ message: 'Gym not found' }, { status: 404 })

    const trainer = await Trainer.findOne({ _id: trainerId, gymId: gym._id })
    if (!trainer) return NextResponse.json({ message: 'Trainer not found in your gym' }, { status: 404 })

    if (action === 'approve') {
      trainer.gymVerificationStatus = 'approved'
      trainer.gymName = gym.name
      trainer.isFullyVerified = trainer.adminVerificationStatus === 'approved'
    } else {
      trainer.gymId = undefined
      trainer.gymName = undefined
      trainer.gymVerificationStatus = 'pending'
      trainer.isFullyVerified = false
      await Gym.updateOne({ _id: gym._id }, { $pull: { trainers: trainer._id } })
    }
    await trainer.save()

    return NextResponse.json({
      message: action === 'approve' ? 'Trainer approved' : 'Trainer removed',
      trainer,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
