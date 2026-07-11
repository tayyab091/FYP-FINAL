import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await connectDB()
    const trainer = await Trainer.findById(id).lean()
    if (!trainer) return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })
    return NextResponse.json(trainer)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
