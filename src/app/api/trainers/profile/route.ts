import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import { getUser } from '@/lib/auth'
import { parseJsonBody, trainerProfileSchema } from '@/lib/validation'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'trainer') {
      return NextResponse.json({ message: 'Trainers only' }, { status: 403 })
    }

    await connectDB()
    const trainer = await Trainer.findOne({ userId: tokenUser.userId }).lean()
    if (!trainer) return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })
    return NextResponse.json(trainer)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'trainer') {
      return NextResponse.json({ message: 'Trainers only' }, { status: 403 })
    }

    const parsed = await parseJsonBody(req, trainerProfileSchema)
    if ('error' in parsed) return parsed.error

    const { specialty, bio, certifications, hourlyRate, experience } = parsed.data

    await connectDB()
    const update: Record<string, unknown> = {}
    if (specialty !== undefined) update.specialty = specialty
    if (bio !== undefined) update.bio = bio
    if (certifications !== undefined) update.certifications = certifications
    if (hourlyRate !== undefined) update.hourlyRate = hourlyRate
    if (experience !== undefined) update.experience = experience

    const trainer = await Trainer.findOneAndUpdate(
      { userId: tokenUser.userId },
      update,
      { new: true, runValidators: true },
    ).lean()

    if (!trainer) return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })
    return NextResponse.json({ trainer, message: 'Trainer profile updated' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
