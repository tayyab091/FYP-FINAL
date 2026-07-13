import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import { normalizePlan, canAccessMealPlans } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import MealPlan from '@/models/MealPlan'
import { mealPlanUpdateSchema, parseJsonBody, parseObjectIdParam } from '@/lib/validation'

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

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertMealPlanAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'plan id')
    if ('error' in idResult) return idResult.error

    await connectDB()
    const plan = await MealPlan.findOne({ _id: idResult.id, userId: tokenUser.userId }).lean()
    if (!plan) return NextResponse.json({ message: 'Meal plan not found' }, { status: 404 })

    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertMealPlanAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'plan id')
    if ('error' in idResult) return idResult.error

    const parsed = await parseJsonBody(req, mealPlanUpdateSchema)
    if ('error' in parsed) return parsed.error
    const body = parsed.data

    await connectDB()
    const plan = await MealPlan.findOne({ _id: idResult.id, userId: tokenUser.userId })
    if (!plan) return NextResponse.json({ message: 'Meal plan not found' }, { status: 404 })

    if (body.title) plan.title = body.title
    if (body.goal !== undefined) plan.goal = body.goal
    if (body.dailyCalories !== undefined) plan.dailyCalories = body.dailyCalories
    if (body.days !== undefined) plan.days = body.days as typeof plan.days
    if (body.preferenceNotes !== undefined) plan.preferenceNotes = body.preferenceNotes

    if (body.status === 'active' || body.status === 'draft') {
      if (body.status === 'active') {
        await MealPlan.updateMany(
          { userId: tokenUser.userId, status: 'active', _id: { $ne: plan._id } },
          { status: 'draft' },
        )
      }
      plan.status = body.status
    }

    await plan.save()
    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const denied = await assertMealPlanAccess(tokenUser.userId, tokenUser.role)
    if (denied) return denied

    const { id: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'plan id')
    if ('error' in idResult) return idResult.error

    await connectDB()
    const deleted = await MealPlan.findOneAndDelete({ _id: idResult.id, userId: tokenUser.userId })
    if (!deleted) return NextResponse.json({ message: 'Meal plan not found' }, { status: 404 })

    return NextResponse.json({ message: 'Meal plan deleted' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
