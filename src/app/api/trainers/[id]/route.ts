import { NextRequest, NextResponse } from 'next/server'
import { findTrainerByIdOrSlug } from '@/lib/resolve-trainer'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const trainer = await findTrainerByIdOrSlug(id)
    if (!trainer) return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })
    return NextResponse.json(trainer)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
