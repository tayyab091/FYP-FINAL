import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Gym from '@/models/Gym'
import Trainer from '@/models/Trainer'
import Relationship from '@/models/Relationship'
import LiveSession from '@/models/LiveSession'
import AuditLog from '@/models/AuditLog'
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

    const [activeClientRows, sessionCounts, auditRows] = await Promise.all([
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
      activeClients: trainerAnalytics.reduce((s, t) => s + t.activeClients, 0),
      liveSessions: trainerAnalytics.reduce((s, t) => s + t.sessionCount, 0),
      featuredTrainers: trainers.filter((t) => t.isFeatured).length,
    }

    return NextResponse.json({ gymId: gym._id, gymName: gym.name, totals, trainers: trainerAnalytics })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
