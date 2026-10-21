import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import WorkoutLog from '@/models/WorkoutLog'

/**
 * Returns today's in-progress workout log (if any) so the client can
 * restore `workoutStarted` / `activeLogId` / per-exercise checklist state
 * after a page reload or revisit, instead of silently losing it.
 * (See BUG_REPORT.md — workout checklist XP persistence bug.)
 *
 * Also returns today's most recently *completed* log (`completedToday`) as a
 * separate field — kept distinct from `log` so existing callers that treat
 * `log` as "there is an in-progress workout to resume" are unaffected. This
 * is what lets the client show today's checklist as checked/read-only after
 * "Complete Workout" instead of resetting to an empty, unchecked list on
 * revisit (see BUG_REPORT.md — checklist unchecked after completing).
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

    const [log, completedToday] = await Promise.all([
      WorkoutLog.findOne({
        userId: tokenUser.userId,
        status: 'in_progress',
        date: { $gte: startOfDay },
      })
        .sort({ createdAt: -1 })
        .lean(),
      WorkoutLog.findOne({
        userId: tokenUser.userId,
        status: 'completed',
        date: { $gte: startOfDay },
      })
        .sort({ createdAt: -1 })
        .lean(),
    ])

    return NextResponse.json({ log: log || null, completedToday: completedToday || null })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
