import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import WorkoutLog from '@/models/WorkoutLog'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const requestedLimit = parseInt(searchParams.get('limit') || '20')
    const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 20
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const skip = (page - 1) * limit

    await connectDB()

    const [logs, total] = await Promise.all([
      WorkoutLog.find({ userId: tokenUser.userId, status: 'completed' })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('planId', 'title goal difficulty')
        .lean(),
      WorkoutLog.countDocuments({ userId: tokenUser.userId, status: 'completed' }),
    ])

    const shaped = logs.map((log) => ({
      ...log,
      plan: log.planId || undefined,
    }))

    // Streak: consecutive days with at least one completed workout
    const recentDates = await WorkoutLog.find({
      userId: tokenUser.userId,
      status: 'completed',
    })
      .sort({ date: -1 })
      .limit(90)
      .select('date')
      .lean()

    const daySet = new Set(
      recentDates.map((entry) => new Date(entry.date).toISOString().slice(0, 10)),
    )
    let streak = 0
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    return NextResponse.json({
      logs: shaped,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      streak,
      totalCompleted: total,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
