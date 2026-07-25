import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { getGamificationMe, getLeaderboard } from '@/lib/gamification'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    await connectDB()

    const leaderboard = req.nextUrl.searchParams.get('leaderboard') === 'true'
    if (leaderboard) {
      const data = await getLeaderboard(tokenUser.userId, 10)
      return NextResponse.json(data)
    }

    const gamification = await getGamificationMe(tokenUser.userId)
    return NextResponse.json(gamification)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
