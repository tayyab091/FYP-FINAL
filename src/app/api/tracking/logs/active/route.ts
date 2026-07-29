import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import WorkoutLog from '@/models/WorkoutLog'

/**
 * Returns today's in-progress workout log (if any) so the client can
 * restore `workoutStarted` / `activeLogId` / per-exercise checklist state
 * after a page reload or revisit, instead of silently losing it.
 * (See BUG_REPORT.md — workout checklist XP persistence bug.)
 */
export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    await connectDB()

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const log = await WorkoutLog.findOne({
      userId: tokenUser.userId,
      status: 'in_progress',
      date: { $gte: startOfDay },
    })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ log: log || null })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
