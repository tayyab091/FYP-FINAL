import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import WorkoutLog from '@/models/WorkoutLog'
import {
  parseObjectIdParam,
  workoutLogCancelSchema,
  workoutLogToggleSchema,
} from '@/lib/validation'

/** Fetch a single workout log (used to restore checklist state on revisit). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'log id')
    if ('error' in idResult) return idResult.error

    await connectDB()
    const log = await WorkoutLog.findOne({ _id: idResult.id, userId: tokenUser.userId }).lean()
    if (!log) {
      return NextResponse.json({ message: 'Workout log not found' }, { status: 404 })
    }

    return NextResponse.json({ log })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

/**
 * Persist per-exercise checklist toggles (or abandon the session) while a
 * workout is still `in_progress`. This is what makes checkbox state survive
 * a reload — previously the checklist only lived in client React state
 * (see BUG_REPORT.md).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'log id')
    if ('error' in idResult) return idResult.error

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    await connectDB()
    const log = await WorkoutLog.findOne({ _id: idResult.id, userId: tokenUser.userId })
    if (!log) {
      return NextResponse.json({ message: 'Workout log not found' }, { status: 404 })
    }
    if (log.status !== 'in_progress') {
      return NextResponse.json(
        { message: 'Only an in-progress workout can be updated' },
        { status: 400 },
      )
    }

    if (raw && typeof raw === 'object' && 'status' in raw) {
      const parsed = workoutLogCancelSchema.safeParse(raw)
      if (!parsed.success) {
        return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
      }
      log.status = 'skipped'
      await log.save()
      return NextResponse.json({ message: 'Workout cancelled', log })
    }

    const parsed = workoutLogToggleSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
    }
    const { exerciseIndex, completed } = parsed.data
    if (!log.exercises || exerciseIndex >= log.exercises.length) {
      return NextResponse.json({ message: 'Invalid exercise index' }, { status: 400 })
    }

    log.exercises[exerciseIndex].completed = completed
    await log.save()

    return NextResponse.json({ message: 'Checklist updated', log })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
