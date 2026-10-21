import { NextRequest, NextResponse } from 'next/server'
import { findTrainerByIdOrSlug } from '@/lib/resolve-trainer'
import { createPublicSlug } from '@/lib/slug'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const trainer = await findTrainerByIdOrSlug(id)
    if (!trainer) return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })
    return NextResponse.json({
      ...trainer,
      slug: trainer.slug || createPublicSlug(String(trainer.name || 'trainer'), trainer._id.toString()),
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
