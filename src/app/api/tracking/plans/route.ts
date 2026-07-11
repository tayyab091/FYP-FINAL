import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import WorkoutPlan from '@/models/WorkoutPlan'
import Trainer from '@/models/Trainer'
import Relationship from '@/models/Relationship'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'trainer') {
      return NextResponse.json({ message: 'Trainers only' }, { status: 403 })
    }

    await connectDB()
    const trainer = await Trainer.findOne({ userId: tokenUser.userId }).select('_id')
    if (!trainer) return NextResponse.json([])
    const plans = await WorkoutPlan.find({ trainerId: trainer._id })
      .select('title userId status goal difficulty durationWeeks createdAt')
      .sort({ createdAt: -1 })
      .lean()
    return NextResponse.json(plans)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'trainer') return NextResponse.json({ message: 'Trainers only' }, { status: 403 })

    await connectDB()
    const { userId, title, goal, durationWeeks, difficulty, weeklySchedule, relationshipId } = await req.json()
    if (!userId || !relationshipId || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ message: 'Client, relationship, and title are required' }, { status: 400 })
    }

    const trainer = await Trainer.findOne({ userId: tokenUser.userId })
    if (!trainer) return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })

    const relationship = await Relationship.findOne({
      _id: relationshipId,
      userId,
      trainerId: trainer._id,
      status: 'active',
      canCreateWorkouts: true,
    })
    if (!relationship) {
      return NextResponse.json({ message: 'Active client relationship required' }, { status: 403 })
    }

    const plan = await WorkoutPlan.create({
      userId, trainerId: trainer._id, relationshipId,
      title: title.trim(), goal, durationWeeks, difficulty,
      weeklySchedule: Array.isArray(weeklySchedule) ? weeklySchedule : [],
      status: 'draft',
    })

    return NextResponse.json(plan, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
