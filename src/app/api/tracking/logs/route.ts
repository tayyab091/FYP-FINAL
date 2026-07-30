import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import WorkoutLog from '@/models/WorkoutLog'
import WorkoutPlan from '@/models/WorkoutPlan'
import { getUser } from '@/lib/auth'
import { parseJsonBody, workoutLogStartSchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const parsed = await parseJsonBody(req, workoutLogStartSchema)
    if ('error' in parsed) return parsed.error

    await connectDB()
    const plan = await WorkoutPlan.findOne({
      _id: parsed.data.planId,
      userId: tokenUser.userId,
      status: 'active',
    }).select('_id')
    if (!plan) {
      return NextResponse.json({ message: 'Active plan not found' }, { status: 404 })
    }

    const date = parsed.data.date ? new Date(parsed.data.date) : new Date()
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ message: 'Invalid date' }, { status: 400 })
    }

    const log = await WorkoutLog.create({
      userId: tokenUser.userId,
      planId: plan._id,
      status: 'in_progress',
      exercises: parsed.data.exercises,
      date,
    })

    return NextResponse.json({ message: 'Workout started', log }, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

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

    // These three queries are independent of each other, so they're run
    // concurrently instead of awaiting the streak lookup after the first two
    // resolve — that previously cost a full extra network round trip to the
    // database on every load of this endpoint.
    const [logs, total, recentDates] = await Promise.all([
      WorkoutLog.find({ userId: tokenUser.userId, status: 'completed' })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('planId', 'title goal difficulty')
        .lean(),
      WorkoutLog.countDocuments({ userId: tokenUser.userId, status: 'completed' }),
      // Streak: consecutive days with at least one completed workout
      WorkoutLog.find({ userId: tokenUser.userId, status: 'completed' })
        .sort({ date: -1 })
        .limit(90)
        .select('date')
        .lean(),
    ])

    const shaped = logs.map((log) => ({
      ...log,
      plan: log.planId || undefined,
    }))

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
