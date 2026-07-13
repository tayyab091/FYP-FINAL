import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import {
  syncUserSubscription,
  normalizePlan,
  canAccessMealPlans,
} from '@/lib/subscription'
import { generateMealPlan } from '@/lib/meal-plan-generator'
import MealPlan from '@/models/MealPlan'
import User from '@/models/User'

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

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertMealPlanAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    await connectDB()
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

    const denied = await assertMealPlanAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    await connectDB()
    const body = await req.json() as {
      goal?: string
      preferenceNotes?: string
      title?: string
      dailyCalories?: number
    }

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
      dailyCaloriesOverride: typeof body.dailyCalories === 'number' ? body.dailyCalories : undefined,
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
