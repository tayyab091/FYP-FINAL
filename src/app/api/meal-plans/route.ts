import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import { normalizePlan, canAccessMealPlans } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import { generateMealPlan } from '@/lib/meal-plan-generator'
import MealPlan from '@/models/MealPlan'
import User from '@/models/User'
import Trainer from '@/models/Trainer'
import Relationship from '@/models/Relationship'
import {
  mealPlanAssignSchema,
  mealPlanGenerateSchema,
} from '@/lib/validation'
import { createNotification } from '@/lib/notifications'

async function assertMealPlanAccess(userId: string, role: string) {
  if (bypassesSubscriptionGate(role)) return null
  const subscription = await syncUserSubscription(userId)
  const plan = normalizePlan(subscription?.plan)
  if (!canAccessMealPlans(plan)) {
    return NextResponse.json(
      { message: 'Personalized meal plans require Pro or Elite' },
      { status: 403 },
    )
  }
  return null
}

function buildDaysFromMeals(
  meals: Array<{
    mealType: string
    name: string
    calories: number
    protein: number
    carbs: number
    fat: number
    notes?: string
  }>,
  durationDays: number,
) {
  return Array.from({ length: durationDays }, (_, i) => ({
    day: `Day ${i + 1}`,
    meals: meals.map((m) => ({
      mealType: m.mealType,
      name: m.name,
      calories: m.calories || 0,
      protein: m.protein || 0,
      carbs: m.carbs || 0,
      fat: m.fat || 0,
      notes: m.notes || '',
    })),
  }))
}

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()

    if (tokenUser.role === 'trainer') {
      const trainer = await Trainer.findOne({ userId: tokenUser.userId }).select('_id')
      if (!trainer) return NextResponse.json([])
      const plans = await MealPlan.find({ trainerId: trainer._id })
        .populate('userId', 'fullName email')
        .sort({ updatedAt: -1 })
        .lean()
      return NextResponse.json(plans)
    }

    const denied = await assertMealPlanAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const plans = await MealPlan.find({ userId: tokenUser.userId })
      .sort({ updatedAt: -1 })
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

    // Peek raw body to decide trainer-assign vs member self-generate
    const raw = await req.json().catch(() => null)
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    const isTrainerAssign =
      tokenUser.role === 'trainer' && typeof (raw as { userId?: unknown }).userId === 'string'

    if (isTrainerAssign) {
      const parsed = mealPlanAssignSchema.safeParse(raw)
      if (!parsed.success) {
        return NextResponse.json(
          { message: parsed.error.issues[0]?.message || 'Invalid meal plan' },
          { status: 400 },
        )
      }
      const body = parsed.data

      const trainer = await Trainer.findOne({ userId: tokenUser.userId })
      if (!trainer) return NextResponse.json({ message: 'Trainer profile not found' }, { status: 404 })

      const relationshipQuery: Record<string, unknown> = {
        userId: body.userId,
        trainerId: trainer._id,
        status: 'active',
      }
      if (body.relationshipId) relationshipQuery._id = body.relationshipId

      const relationship = await Relationship.findOne(relationshipQuery)
      if (!relationship) {
        return NextResponse.json({ message: 'Active client relationship required' }, { status: 403 })
      }

      const dailyCalories =
        body.dailyCalories ??
        Math.round(body.meals.reduce((sum, m) => sum + (m.calories || 0), 0))

      const days = buildDaysFromMeals(body.meals, body.durationDays)

      await MealPlan.updateMany(
        { userId: body.userId, status: 'active' },
        { status: 'draft' },
      )

      const plan = await MealPlan.create({
        userId: body.userId,
        trainerId: trainer._id,
        relationshipId: relationship._id,
        title: body.title,
        goal: body.goal,
        durationDays: body.durationDays,
        dailyCalories: Math.max(800, dailyCalories),
        days,
        status: 'active',
        preferenceNotes: body.preferenceNotes || '',
      })

      try {
        const trainerUser = await User.findById(tokenUser.userId).select('fullName').lean()
        const trainerName = trainerUser?.fullName || 'Your trainer'
        await createNotification({
          userId: body.userId,
          title: 'Meal plan assigned',
          message: `${trainerName} assigned you “${body.title}”`,
          type: 'workout',
          link: '/meal-plans',
        })
      } catch (notifyError) {
        console.error('Meal plan notify error:', notifyError)
      }

      return NextResponse.json(plan, { status: 201 })
    }

    // Member self-generate (Pro/Elite)
    const denied = await assertMealPlanAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const parsed = mealPlanGenerateSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid request' },
        { status: 400 },
      )
    }
    const body = parsed.data

    const profile = await User.findById(tokenUser.userId)
      .select('fitnessGoal activityLevel currentWeight targetWeight')
      .lean()

    const generated = generateMealPlan({
      goal: body.goal || profile?.fitnessGoal,
      fitnessGoal: body.goal || profile?.fitnessGoal,
      activityLevel: profile?.activityLevel,
      currentWeight: profile?.currentWeight,
      targetWeight: profile?.targetWeight,
      preferenceNotes: body.preferenceNotes,
      title: body.title,
      dailyCaloriesOverride: body.dailyCalories,
    })

    const plan = await MealPlan.create({
      userId: tokenUser.userId,
      ...generated,
    })

    return NextResponse.json(plan, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
