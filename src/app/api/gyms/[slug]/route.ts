import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDBWithTimeout } from '@/lib/mongodb'
import Gym from '@/models/Gym'
import { normalizeGym, PREVIEW_GYMS } from '@/lib/gyms'
import { idFromPublicSlug } from '@/lib/slug'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const preview = PREVIEW_GYMS.find((gym) => gym.slug === slug || gym.id === slug)
  if (preview) return NextResponse.json(preview)

  try {
    await connectDBWithTimeout(4000)
    const suffix = idFromPublicSlug(slug)
    const selectors: Record<string, unknown>[] = [{ slug }]
    if (suffix && mongoose.Types.ObjectId.isValid(suffix)) selectors.push({ _id: suffix })
    if (mongoose.Types.ObjectId.isValid(slug)) selectors.push({ _id: slug })

    const gym = await Gym.findOne({ $or: selectors, verificationStatus: 'verified' })
      .populate('trainers', 'name specialty rating profileImage isFullyVerified')
      .lean()
    if (!gym) return NextResponse.json({ message: 'Gym not found' }, { status: 404 })
    return NextResponse.json(normalizeGym(gym as unknown as Record<string, unknown>))
  } catch (error) {
    console.error('Gym detail lookup failed:', error)
    return NextResponse.json({ message: 'Gym not found' }, { status: 404 })
  }
}
