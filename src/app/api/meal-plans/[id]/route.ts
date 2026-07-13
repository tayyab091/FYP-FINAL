import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { bypassesSubscriptionGate } from '@/lib/access'
import { normalizePlan, canAccessMealPlans } from '@/lib/subscription'
import { syncUserSubscription } from '@/lib/subscription-server'
import MealPlan from '@/models/MealPlan'
import mongoose from 'mongoose'

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

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid plan id' }, { status: 400 })
    }

    await connectDB()
    const plan = await MealPlan.findOne({ _id: id, userId: tokenUser.userId }).lean()
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

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid plan id' }, { status: 400 })
    }

    await connectDB()
    const plan = await MealPlan.findOne({ _id: id, userId: tokenUser.userId })
    if (!plan) return NextResponse.json({ message: 'Meal plan not found' }, { status: 404 })

    const body = await req.json() as {
      title?: string
      goal?: string
      dailyCalories?: number
      days?: unknown
      status?: string
      preferenceNotes?: string
    }

    if (typeof body.title === 'string' && body.title.trim()) plan.title = body.title.trim()
    if (typeof body.goal === 'string') plan.goal = body.goal
    if (typeof body.dailyCalories === 'number' && body.dailyCalories > 0) {
      plan.dailyCalories = Math.round(body.dailyCalories)
    }
    if (Array.isArray(body.days)) plan.days = body.days
    if (typeof body.preferenceNotes === 'string') plan.preferenceNotes = body.preferenceNotes

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

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid plan id' }, { status: 400 })
    }

    await connectDB()
    const deleted = await MealPlan.findOneAndDelete({ _id: id, userId: tokenUser.userId })
    if (!deleted) return NextResponse.json({ message: 'Meal plan not found' }, { status: 404 })

    return NextResponse.json({ message: 'Meal plan deleted' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
