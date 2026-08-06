import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import GamificationProfile from '@/models/GamificationProfile'
import User from '@/models/User'
import { USER_AVATAR_POPULATE_SELECT, resolveAvatarUrl } from '@/lib/avatar'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const period = req.nextUrl.searchParams.get('period') || 'week'

    const profiles = await GamificationProfile.find({})
      .sort({ xp: -1, updatedAt: 1 })
      .limit(10)
      .lean()

    const userIds = profiles.map((p) => p.userId)
    const users = await User.find({ _id: { $in: userIds } })
      .select(USER_AVATAR_POPULATE_SELECT)
      .lean()
    const userById = new Map(users.map((u) => [String(u._id), u]))

    const shaped = profiles.map((l) => {
      const u = userById.get(String(l.userId))
      const xpBase = l.xp || 0
      const xp =
        period === 'week' || period === 'month'
          ? xpBase
          : xpBase
      return {
        _id: String(l._id),
        userId: String(l.userId),
        fullName: u?.fullName || 'Anonymous',
        profileImage: resolveAvatarUrl(u) || u?.profileImage || '',
        avatarUrl: resolveAvatarUrl(u) || '',
        role: u?.role || 'user',
        xp,
        level: l.level || 1,
        streak: 0,
        badges: [],
      }
    })

    return NextResponse.json(shaped)
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json([])
  }
}
