import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import WorkoutPlan from '@/models/WorkoutPlan'
import WorkoutLog from '@/models/WorkoutLog'

interface CompletedExercise {
  name: string
  setsCompleted?: number
  repsCompleted?: string
  notes?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const exercises = Array.isArray(body.exercises)
      ? body.exercises.filter(
          (exercise: CompletedExercise) =>
            typeof exercise.name === 'string' && exercise.name.trim(),
        )
      : []

    await connectDB()
    const plan = await WorkoutPlan.findOne({
      _id: id,
      userId: tokenUser.userId,
      status: 'active',
    }).select('_id')
    if (!plan) {
      return NextResponse.json({ message: 'Active plan not found' }, { status: 404 })
    }

    const log = await WorkoutLog.create({
      userId: tokenUser.userId,
      planId: plan._id,
      status: 'completed',
      exercises,
      durationMinutes: Math.max(0, Number(body.durationMinutes) || 0),
      notes: typeof body.notes === 'string' ? body.notes.trim() : '',
      date: new Date(),
    })

    return NextResponse.json(
      { message: 'Workout completed', log },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
