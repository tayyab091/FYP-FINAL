import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Review from '@/models/Review'
import GymReview from '@/models/GymReview'
import '@/models/Trainer'
import '@/models/Gym'
import { createPublicSlug } from '@/lib/slug'

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (user.role !== 'user') return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    await connectDB()
    const [trainers, gyms] = await Promise.all([
      Review.find({ userId: user.userId }).populate('trainerId', 'name slug').sort({ createdAt: -1 }).lean(),
      GymReview.find({ userId: user.userId }).populate('gymId', 'name slug').sort({ createdAt: -1 }).lean(),
    ])
    return NextResponse.json({ reviews: [
      ...trainers.filter(row => row.trainerId).map(row => ({ id: String(row._id), type: 'Trainer', name: row.trainerId.name, href: `/coaching/${row.trainerId.slug || createPublicSlug(row.trainerId.name, String(row.trainerId._id))}#reviews`, rating: row.rating, comment: row.comment, createdAt: row.createdAt })),
      ...gyms.filter(row => row.gymId).map(row => ({ id: String(row._id), type: 'Gym', name: row.gymId.name, href: `/gyms/${row.gymId.slug || createPublicSlug(row.gymId.name, String(row.gymId._id))}#reviews`, rating: row.rating, comment: row.comment, createdAt: row.createdAt })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) })
  } catch { return NextResponse.json({ message: 'Unable to load your reviews' }, { status: 503 }) }
}
