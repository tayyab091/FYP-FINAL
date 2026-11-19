import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { parseJsonBody, parseObjectIdParam } from '@/lib/validation'
import MealPlan from '@/models/MealPlan'
import { POST as logMeal } from '@/app/api/tracking/meal-logs/today/route'

const selectionSchema = z.object({ dayIndex: z.number().int().min(0), mealIndex: z.number().int().min(0) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getUser(req)
  if (!member) return NextResponse.json({ message: 'Sign in to log a meal' }, { status: 401 })
  if (member.role !== 'user') return NextResponse.json({ message: 'Member account required' }, { status: 403 })
  const id = parseObjectIdParam((await params).id, 'meal plan')
  if ('error' in id) return id.error
  const body = await parseJsonBody(req, selectionSchema)
  if ('error' in body) return body.error
  try {
    await connectDB()
    const plan = await MealPlan.findOne({ _id: id.id, userId: member.userId }).lean()
    const meal = plan?.days?.[body.data.dayIndex]?.meals?.[body.data.mealIndex]
    if (!meal) return NextResponse.json({ message: 'Planned meal not found' }, { status: 404 })
    return logMeal(new NextRequest(new URL('/api/tracking/meal-logs/today', req.url), {
      method: 'POST', headers: req.headers,
      body: JSON.stringify({
        requestKey: `plan:${id.id}:${body.data.dayIndex}:${body.data.mealIndex}:${new Date().toISOString().slice(0, 10)}`,
        mealType: meal.mealType,
        foods: [{ name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, quantity: 1, unit: 'serving' }],
      }),
    }))
  } catch {
    return NextResponse.json({ message: 'Unable to log this planned serving. Please try again.' }, { status: 503 })
  }
}
