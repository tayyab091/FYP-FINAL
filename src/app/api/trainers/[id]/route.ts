import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import mongoose from 'mongoose'
import { createPublicSlug, idFromPublicSlug } from '@/lib/slug'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const trainerId = idFromPublicSlug(id) || id
    if (!mongoose.isValidObjectId(trainerId)) {
      return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })
    }
    await connectDB()
    const trainer = await Trainer.findById(trainerId).lean()
    if (!trainer) return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })
    return NextResponse.json({
      ...trainer,
      slug: createPublicSlug(trainer.name, trainer._id.toString()),
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
