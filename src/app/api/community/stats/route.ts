import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import { normalizePlan, canAccessCommunity } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import CommunityPost from '@/models/CommunityPost'
import User from '@/models/User'

async function assertCommunityAccess(userId: string, role: string) {
  if (bypassesSubscriptionGate(role)) return null
  const subscription = await syncUserSubscription(userId)
  if (!subscription || subscription.status === 'inactive') {
    return NextResponse.json({ message: 'Active subscription required' }, { status: 403 })
  }
  if (!canAccessCommunity(normalizePlan(subscription.plan))) {
    return NextResponse.json({ message: 'Community requires Basic plan or higher' }, { status: 403 })
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertCommunityAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    await connectDB()

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [totalPosts, totalMembers, activeToday] = await Promise.all([
      CommunityPost.countDocuments({}),
      User.countDocuments({ isActive: { $ne: false } }),
      CommunityPost.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        {
          $group: {
            _id: '$authorId',
            count: { $sum: 1 },
            authorName: { $first: '$authorName' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
    ])

    const top = activeToday[0]

    return NextResponse.json({
      totalPosts,
      totalMembers,
      mostActiveToday: top?.authorName || '—',
      mostActiveTodayPosts: top?.count || 0,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
