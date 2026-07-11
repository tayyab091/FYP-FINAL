import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import Relationship from '@/models/Relationship'
import User from '@/models/User'
import ProgressRecord from '@/models/ProgressRecord'
import WorkoutPlan from '@/models/WorkoutPlan'
import WorkoutLog from '@/models/WorkoutLog'
import MealLog from '@/models/MealLog'
import { getUser } from '@/lib/auth'
import mongoose from 'mongoose'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'trainer') {
      return NextResponse.json({ message: 'Trainers only' }, { status: 403 })
    }

    const { userId } = await params
    if (!mongoose.isValidObjectId(userId)) {
      return NextResponse.json({ message: 'Client not found' }, { status: 404 })
    }

    await connectDB()
    const trainer = await Trainer.findOne({ userId: tokenUser.userId })
    if (!trainer) return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })

    const relationship = await Relationship.findOne({
      trainerId: trainer._id,
      userId,
      status: 'active',
    }).lean()
    if (!relationship) {
      return NextResponse.json({ message: 'No active client relationship' }, { status: 404 })
    }

    const client = await User.findById(userId)
      .select('fullName email profileImage country fitnessGoal activityLevel currentWeight targetWeight')
      .lean()
    if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 })

    const response: Record<string, unknown> = {
      client,
      permissions: {
        canViewProgress: relationship.canViewProgress,
        canViewNutrition: relationship.canViewNutrition,
        canEditSchedule: relationship.canEditSchedule,
      },
    }

    if (relationship.canViewProgress) {
      const [progress, activePlan, recentWorkouts] = await Promise.all([
        ProgressRecord.find({ userId }).sort({ date: -1 }).limit(10).lean(),
        WorkoutPlan.findOne({ userId, status: 'active' }).lean(),
        WorkoutLog.find({ userId, status: 'completed' })
          .sort({ date: -1 })
          .limit(5)
          .populate('planId', 'title')
          .lean(),
      ])
      response.progress = progress
      response.activePlan = activePlan
      response.recentWorkouts = recentWorkouts.map((log) => ({
        ...log,
        planTitle: (log.planId as { title?: string } | null)?.title,
      }))
    }

    if (relationship.canViewNutrition) {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      const meals = await MealLog.find({
        userId,
        date: { $gte: startOfDay, $lte: endOfDay },
      }).lean()

      const totals = meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (meal.totalCalories || 0),
          protein: acc.protein + (meal.totalProtein || 0),
          carbs: acc.carbs + (meal.totalCarbs || 0),
          fat: acc.fat + (meal.totalFat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )

      response.todayNutrition = { meals, totals }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Client progress error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
