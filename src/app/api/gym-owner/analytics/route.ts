import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Gym from '@/models/Gym'
import Trainer from '@/models/Trainer'
import Relationship from '@/models/Relationship'
import LiveSession from '@/models/LiveSession'
import AuditLog from '@/models/AuditLog'
import GymReview from '@/models/GymReview'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'gym_owner') {
      return NextResponse.json({ message: 'Gym owner access required' }, { status: 403 })
    }

    await connectDB()
    const gym = await Gym.findOne({ ownerId: tokenUser.userId }).lean()
    if (!gym) {
      return NextResponse.json({
        totals: {
          trainers: 0,
          verifiedTrainers: 0,
          activeClients: 0,
          liveSessions: 0,
          featuredTrainers: 0,
        },
        trainers: [],
      })
    }

    const trainers = await Trainer.find({ gymId: gym._id }).lean()
    const trainerIds = trainers.map((t) => t._id)
    const trainerUserIds = trainers.map((t) => t.userId)

    const [activeClientRows, sessionCounts, auditRows, reviewStats, sessionStates, clients] = await Promise.all([
      Relationship.aggregate<{ _id: unknown; count: number }>([
        { $match: { trainerId: { $in: trainerIds }, status: 'active' } },
        { $group: { _id: '$trainerId', count: { $sum: 1 } } },
      ]),
      LiveSession.aggregate<{ _id: unknown; count: number }>([
        { $match: { trainerId: { $in: trainerUserIds } } },
        { $group: { _id: '$trainerId', count: { $sum: 1 } } },
      ]),
      AuditLog.find({
        targetId: { $in: trainerIds },
        action: { $in: ['TRAINER_VERIFIED', 'TRAINER_REJECTED'] },
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      GymReview.aggregate([{ $match: { gymId: gym._id } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
      LiveSession.aggregate([{ $match: { trainerId: { $in: trainerUserIds } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Relationship.distinct('userId', { trainerId: { $in: trainerIds }, status: 'active' }),
    ])

    const activeByTrainer = new Map(activeClientRows.map((r) => [String(r._id), r.count]))
    const sessionsByTrainerUser = new Map(sessionCounts.map((r) => [String(r._id), r.count]))
    const auditsByTrainer = new Map<string, typeof auditRows>()
    for (const row of auditRows) {
      const key = String(row.targetId)
      const list = auditsByTrainer.get(key) ?? []
      list.push(row)
      auditsByTrainer.set(key, list)
    }

    const trainerAnalytics = trainers.map((t) => {
      const tid = String(t._id)
      const verificationHistory = [
        {
          field: 'gymVerificationStatus',
          status: t.gymVerificationStatus,
          at: t.updatedAt,
        },
        {
          field: 'adminVerificationStatus',
          status: t.adminVerificationStatus,
          at: t.updatedAt,
        },
        ...(auditsByTrainer.get(tid) ?? []).map((log) => ({
          field: 'platform_audit',
          status: log.action,
          at: log.createdAt,
          reason: (log.details as { reason?: string })?.reason,
          actorId: log.adminId,
        })),
      ]

      return {
        trainerId: t._id,
        name: t.name,
        email: t.email,
        activeClients: activeByTrainer.get(tid) ?? 0,
        totalClients: t.totalClients ?? 0,
        sessionCount: sessionsByTrainerUser.get(String(t.userId)) ?? 0,
        rating: t.rating,
        isActive: t.isActive,
        isFeatured: t.isFeatured,
        verification: {
          gym: t.gymVerificationStatus,
          admin: t.adminVerificationStatus,
          isFullyVerified: t.isFullyVerified,
        },
        verificationHistory,
      }
    })

    const totals = {
      trainers: trainers.length,
      verifiedTrainers: trainers.filter((t) => t.isFullyVerified).length,
      activeClients: clients.length,
      liveSessions: trainerAnalytics.reduce((s, t) => s + t.sessionCount, 0),
      featuredTrainers: trainers.filter((t) => t.isFeatured).length,
    }

    return NextResponse.json({ gymId: gym._id, gymName: gym.name, totals, trainers: trainerAnalytics,
      gym: {
        rating: gym.rating || 0,
        reviewsCount: gym.reviewsCount || 0,
        facilities: gym.facilities || [],
        galleryPhotos: gym.images?.length || 0,
        verificationStatus: gym.verificationStatus,
        profileComplete: [gym.name, gym.address, gym.description, gym.phone, gym.email, gym.images?.length, gym.facilities?.length].filter(Boolean).length,
        profileFields: 7,
        ratingDistribution: [5, 4, 3, 2, 1].map(rating => ({ rating, count: reviewStats.find(row => row._id === rating)?.count || 0 })),
        sessions: Object.fromEntries(sessionStates.map(row => [row._id, row.count])),
      },
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
