import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import WorkoutPlan from '@/models/WorkoutPlan'
import Trainer from '@/models/Trainer'
import Relationship from '@/models/Relationship'
import { getUser } from '@/lib/auth'
import { parseJsonBody, workoutPlanCreateSchema } from '@/lib/validation'
import { sanitizePlainText } from '@/lib/sanitize'
import { z } from 'zod'

const selfPlanSchema = z.object({
  title: z.string().min(1).max(120),
  goal: z.string().optional(),
  durationWeeks: z.number().int().min(1).max(52).optional(),
  difficulty: z.string().max(40).optional(),
  weeklySchedule: z.array(z.unknown()).max(14).optional().default([]),
  activateNow: z.boolean().optional(),
  trainerId: z.string().optional(),
})

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

    await connectDB()

    if (tokenUser.role === 'user') {
      const body = await req.json()
      const parsed = selfPlanSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ message: 'Invalid plan data' }, { status: 400 })
      }
      const { title, goal, durationWeeks, difficulty, weeklySchedule, activateNow, trainerId } = parsed.data

      if (activateNow) {
        await WorkoutPlan.updateMany(
          { userId: tokenUser.userId, status: 'active' },
          { status: 'completed' },
        )
      }

      const plan = await WorkoutPlan.create({
        userId: tokenUser.userId,
        trainerId: trainerId || undefined,
        title: sanitizePlainText(title, 120),
        goal: goal || 'general_fitness',
        durationWeeks: durationWeeks ?? 8,
        difficulty: difficulty ? sanitizePlainText(difficulty, 40) : 'beginner',
        weeklySchedule: Array.isArray(weeklySchedule) ? weeklySchedule : [],
        status: activateNow ? 'active' : 'draft',
        startDate: activateNow ? new Date() : undefined,
      })

      return NextResponse.json(plan, { status: 201 })
    }

    if (tokenUser.role !== 'trainer') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const parsed = await parseJsonBody(req, workoutPlanCreateSchema)
    if ('error' in parsed) return parsed.error
    const { userId, relationshipId, title, goal, durationWeeks, difficulty, weeklySchedule } = parsed.data

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
      userId,
      trainerId: trainer._id,
      relationshipId,
      title,
      goal: goal || '',
      durationWeeks,
      difficulty: difficulty ? sanitizePlainText(difficulty, 40) : undefined,
      weeklySchedule: Array.isArray(weeklySchedule) ? weeklySchedule : [],
      status: 'draft',
    })

    return NextResponse.json(plan, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
