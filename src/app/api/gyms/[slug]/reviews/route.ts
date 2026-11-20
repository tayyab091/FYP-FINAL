import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { getUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { idFromPublicSlug } from '@/lib/slug'
import { parseJsonBody, reviewSchema } from '@/lib/validation'
import Gym from '@/models/Gym'
import GymReview from '@/models/GymReview'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import { createNotification } from '@/lib/notifications'

async function findGym(slug: string) {
  await connectDB()
  const id = idFromPublicSlug(slug) || slug
  const selectors: Record<string, unknown>[] = [{ slug }]
  if (mongoose.Types.ObjectId.isValid(id)) selectors.push({ _id: id })
  return Gym.findOne({ $or: selectors, verificationStatus: 'verified' }).lean()
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const gym = await findGym((await params).slug)
    if (!gym) return NextResponse.json({ message: 'Gym not found' }, { status: 404 })
    const [rows, tokenUser] = await Promise.all([
      GymReview.find({ gymId: gym._id }).sort({ createdAt: -1 }).limit(100).populate('userId', 'fullName').lean(),
      getUser(req),
    ])
    const mine = tokenUser ? await GymReview.findOne({ gymId: gym._id, userId: tokenUser.userId }).lean() : null
    return NextResponse.json({
      reviews: rows.map(row => ({ _id: String(row._id), rating: row.rating, comment: row.comment, createdAt: row.createdAt, authorName: row.anonymous ? 'Anonymous member' : row.userId?.fullName || 'Member' })),
      averageRating: gym.rating || 0, reviewCount: gym.reviewsCount || 0,
      currentUserReview: mine ? { rating: mine.rating, comment: mine.comment } : null,
      canReview: tokenUser?.role === 'user' || (tokenUser?.role === 'trainer' && Boolean(await Trainer.exists({ userId: tokenUser.userId, gymId: gym._id, gymVerificationStatus: 'approved' }))),
    })
  } catch { return NextResponse.json({ message: 'Unable to load reviews' }, { status: 503 }) }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const member = await getUser(req)
    if (!member) return NextResponse.json({ message: 'Sign in to leave a review' }, { status: 401 })
    if (!['user', 'trainer'].includes(member.role)) return NextResponse.json({ message: 'A member or connected trainer account is required' }, { status: 403 })
    const parsed = await parseJsonBody(req, reviewSchema)
    if ('error' in parsed) return parsed.error
    const gym = await findGym((await params).slug)
    if (!gym) return NextResponse.json({ message: 'Gym not found' }, { status: 404 })
    if (String(gym.ownerId) === member.userId) return NextResponse.json({ message: 'You cannot review your own gym' }, { status: 403 })
    if (member.role === 'trainer' && !await Trainer.exists({ userId: member.userId, gymId: gym._id, gymVerificationStatus: 'approved' })) {
      return NextResponse.json({ message: 'You can only review your approved connected gym' }, { status: 403 })
    }
    const review = await GymReview.create({ gymId: gym._id, userId: member.userId, ...parsed.data })
    const [stats] = await GymReview.aggregate([{ $match: { gymId: gym._id } }, { $group: { _id: null, rating: { $avg: '$rating' }, count: { $sum: 1 } } }])
    const averageRating = Math.round(stats.rating * 10) / 10
    await Gym.updateOne({ _id: gym._id }, { $set: { rating: averageRating, reviewsCount: stats.count } })
    await createNotification({
      userId: gym.ownerId, title: 'New gym review',
      message: (parsed.data.anonymous ? 'An anonymous reviewer' : 'A ' + (member.role === 'trainer' ? 'trainer' : 'member')) + ' left a ' + parsed.data.rating + '-star review for your gym.',
      type: 'trainer', link: '/gym-owner?tab=analytics', dedupKey: 'gym-review:' + String(review._id),
    }).catch(() => {})
    const author = await User.findById(member.userId).select('fullName').lean()
    return NextResponse.json({ review: { _id: String(review._id), ...parsed.data, createdAt: review.createdAt, authorName: parsed.data.anonymous ? 'Anonymous member' : author?.fullName || 'Member' }, averageRating, reviewCount: stats.count }, { status: 201 })
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) return NextResponse.json({ message: 'You have already reviewed this gym' }, { status: 409 })
    return NextResponse.json({ message: 'Unable to save your review. Please try again.' }, { status: 503 })
  }
}
