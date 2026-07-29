import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import Review from '@/models/Review'
import Trainer from '@/models/Trainer'
import User from '@/models/User'
import Relationship from '@/models/Relationship'
import { parseJsonBody, reviewSchema } from '@/lib/validation'
import { findTrainerByIdOrSlug, resolveTrainerObjectId } from '@/lib/resolve-trainer'

async function getReviewStats(trainerId: string) {
  const stats = await Review.aggregate([
    { $match: { trainerId: new mongoose.Types.ObjectId(trainerId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ])

  const averageRating = stats[0]?.averageRating ?? 0
  const reviewCount = stats[0]?.reviewCount ?? 0
  return { averageRating, reviewCount }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const trainerId = await resolveTrainerObjectId(id)
    if (!trainerId) {
      return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })
    }

    await connectDB()

    const reviews = await Review.find({ trainerId })
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName')
      .lean()

    const { averageRating, reviewCount } = await getReviewStats(trainerId)

    const tokenUser = await getUser(req)
    let currentUserReview = null
    if (tokenUser) {
      const mine = reviews.find(r => r.userId?._id?.toString() === tokenUser.userId)
      if (mine) {
        currentUserReview = {
          _id: mine._id.toString(),
          rating: mine.rating,
          comment: mine.comment,
          createdAt: mine.createdAt,
        }
      }
    }

    return NextResponse.json({
      reviews: reviews.map(review => ({
        _id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        authorName: (review.userId as { fullName?: string } | null)?.fullName || 'Anonymous',
      })),
      averageRating: reviewCount > 0 ? Math.round(averageRating * 10) / 10 : 0,
      reviewCount,
      currentUserReview,
    })
  } catch (error) {
    console.error('Reviews GET error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const trainer = await findTrainerByIdOrSlug(id)
    if (!trainer) {
      return NextResponse.json({ message: 'Trainer not found' }, { status: 404 })
    }
    const trainerId = trainer._id.toString()

    const parsed = await parseJsonBody(req, reviewSchema)
    if ('error' in parsed) return parsed.error
    const { rating, comment } = parsed.data

    await connectDB()

    if (trainer.userId?.toString() === tokenUser.userId) {
      return NextResponse.json({ message: 'You cannot review yourself' }, { status: 403 })
    }

    const relationship = await Relationship.findOne({
      userId: tokenUser.userId,
      trainerId,
      status: 'active',
    }).select('_id')
    if (!relationship) {
      return NextResponse.json(
        { message: 'An active trainer relationship is required to leave a review' },
        { status: 403 },
      )
    }

    const user = await User.findById(tokenUser.userId).select('fullName').lean()
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const existing = await Review.findOne({ trainerId, userId: tokenUser.userId })
    if (existing) {
      return NextResponse.json({ message: 'You have already reviewed this trainer' }, { status: 409 })
    }

    const review = await Review.create({
      trainerId,
      userId: tokenUser.userId,
      rating,
      comment,
    })

    const { averageRating, reviewCount } = await getReviewStats(trainerId)
    const roundedRating = reviewCount > 0 ? Math.round(averageRating * 10) / 10 : 5
    await Trainer.updateOne({ _id: trainerId }, { $set: { rating: roundedRating } })

    if (trainer.userId) {
      const slug = typeof trainer.slug === 'string' ? trainer.slug : trainerId
      await createNotification({
        userId: trainer.userId,
        title: 'New review received',
        message: `${user.fullName} left you a ${rating}-star review`,
        type: 'trainer',
        link: `/coaching/${slug}`,
      })
    }

    return NextResponse.json({
      review: {
        _id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        authorName: user.fullName,
      },
      averageRating: roundedRating,
      reviewCount,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json({ message: 'You have already reviewed this trainer' }, { status: 409 })
    }
    console.error('Reviews POST error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
