import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import Review from '@/models/Review'
import GymReview from '@/models/GymReview'
import Trainer from '@/models/Trainer'
import Relationship from '@/models/Relationship'
import Gym from '@/models/Gym'

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

    const relationships = await Relationship.find({ userId: user.userId, status: 'active' }).select('trainerId').lean()
    const connectedTrainers = await Trainer.find({ _id: { $in: relationships.map(row => row.trainerId) } }).select('name slug gymId').lean()
    const connectedGyms = await Gym.find({
      $or: [
        { _id: { $in: connectedTrainers.map(row => row.gymId).filter(Boolean) } },
        { trainers: { $in: connectedTrainers.map(row => row._id) } },
      ],
      verificationStatus: 'verified',
    }).select('name slug').lean()
    const targets = [
      ...connectedTrainers.map(row => ({
        id: String(row._id), type: 'Trainer', name: row.name,
        endpoint: '/api/trainers/' + String(row._id) + '/reviews',
        reviewed: trainers.some(review => String(review.trainerId?._id) === String(row._id)),
      })),
      ...connectedGyms.map(row => ({
        id: String(row._id), type: 'Gym', name: row.name,
        endpoint: '/api/gyms/' + (row.slug || String(row._id)) + '/reviews',
        reviewed: gyms.some(review => String(review.gymId?._id) === String(row._id)),
      })),
    ]
    return NextResponse.json({ targets, reviews: [
      ...trainers.filter(row => row.trainerId).map(row => ({ id: String(row._id), type: 'Trainer', name: row.trainerId.name, href: `/coaching/${row.trainerId.slug || createPublicSlug(row.trainerId.name, String(row.trainerId._id))}#reviews`, rating: row.rating, comment: row.comment, anonymous: Boolean(row.anonymous), createdAt: row.createdAt })),
      ...gyms.filter(row => row.gymId).map(row => ({ id: String(row._id), type: 'Gym', name: row.gymId.name, href: `/gyms/${row.gymId.slug || createPublicSlug(row.gymId.name, String(row.gymId._id))}#reviews`, rating: row.rating, comment: row.comment, anonymous: Boolean(row.anonymous), createdAt: row.createdAt })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) })
  } catch { return NextResponse.json({ message: 'Unable to load your reviews' }, { status: 503 }) }
}
