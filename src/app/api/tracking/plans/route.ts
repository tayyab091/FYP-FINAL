import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import WorkoutPlan from '@/models/WorkoutPlan'
import Trainer from '@/models/Trainer'
import { getUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'trainer') return NextResponse.json({ message: 'Trainers only' }, { status: 403 })

    await connectDB()
    const { userId, title, goal, durationWeeks, difficulty, weeklySchedule, relationshipId } = await req.json()

    const trainer = await Trainer.findOne({ userId: tokenUser.userId })
    if (!trainer) return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })

    const plan = await WorkoutPlan.create({
      userId, trainerId: trainer._id, relationshipId,
      title, goal, durationWeeks, difficulty,
      weeklySchedule: weeklySchedule || [],
      status: 'draft',
    })

    return NextResponse.json(plan, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
