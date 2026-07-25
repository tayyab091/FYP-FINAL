import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import Trainer from '@/models/Trainer'
import mongoose from 'mongoose'

const AvailabilitySchema = new mongoose.Schema(
  {
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', unique: true },
    slots: [
      {
        dayOfWeek: { type: Number },
        startTime: String,
        endTime: String,
        isAvailable: { type: Boolean, default: true },
      },
    ],
    timezone: { type: String, default: 'Asia/Karachi' },
  },
  { timestamps: true },
)

const Availability =
  mongoose.models.TrainerAvailability ||
  mongoose.model('TrainerAvailability', AvailabilitySchema)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const trainerId = searchParams.get('trainerId')
    if (!trainerId) return NextResponse.json({ message: 'trainerId required' }, { status: 400 })
    if (!mongoose.Types.ObjectId.isValid(trainerId)) {
      return NextResponse.json({ slots: [] })
    }
    await connectDB()
    const availability = await Availability.findOne({ trainerId }).lean()
    return NextResponse.json(availability || { slots: [] })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser || tokenUser.role !== 'trainer') {
      return NextResponse.json({ message: 'Trainers only' }, { status: 403 })
    }
    await connectDB()
    const trainer = await Trainer.findOne({ userId: tokenUser.userId })
    if (!trainer) return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })

    const { slots, timezone } = await req.json()
    const availability = await Availability.findOneAndUpdate(
      { trainerId: trainer._id },
      { trainerId: trainer._id, slots, timezone },
      { upsert: true, new: true },
    )
    return NextResponse.json(availability)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
