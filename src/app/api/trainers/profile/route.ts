import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import { getUser } from '@/lib/auth'

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

    const { specialty, bio, certifications, hourlyRate, experience } = await req.json()

    if (specialty !== undefined && (!Array.isArray(specialty) || !specialty.every((s) => typeof s === 'string'))) {
      return NextResponse.json({ message: 'specialty must be an array of strings' }, { status: 400 })
    }
    if (certifications !== undefined && (!Array.isArray(certifications) || !certifications.every((c) => typeof c === 'string'))) {
      return NextResponse.json({ message: 'certifications must be an array of strings' }, { status: 400 })
    }
    if (hourlyRate !== undefined && (typeof hourlyRate !== 'number' || hourlyRate < 0)) {
      return NextResponse.json({ message: 'hourlyRate must be a non-negative number' }, { status: 400 })
    }
    if (bio !== undefined && typeof bio !== 'string') {
      return NextResponse.json({ message: 'bio must be a string' }, { status: 400 })
    }

    await connectDB()
    const update: Record<string, unknown> = {}
    if (specialty !== undefined) update.specialty = specialty.map((s: string) => s.trim()).filter(Boolean)
    if (bio !== undefined) update.bio = bio.trim().slice(0, 2000)
    if (certifications !== undefined) update.certifications = certifications.map((c: string) => c.trim()).filter(Boolean)
    if (hourlyRate !== undefined) update.hourlyRate = hourlyRate
    if (experience !== undefined && typeof experience === 'string') update.experience = experience.trim().slice(0, 500)

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
