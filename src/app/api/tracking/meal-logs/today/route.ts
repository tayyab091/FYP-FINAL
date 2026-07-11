import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import MealLog from '@/models/MealLog'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const meals = await MealLog.find({
      userId: tokenUser.userId,
      date: { $gte: today, $lt: tomorrow },
    }).lean()

    const totals = meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalProtein || 0),
      carbs: acc.carbs + (meal.totalCarbs || 0),
      fat: acc.fat + (meal.totalFat || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

    return NextResponse.json({ meals, totals })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()
    const { mealType, foods } = await req.json()
    if (!mealType || !foods?.length) {
      return NextResponse.json({ message: 'Meal type and foods required' }, { status: 400 })
    }

    const totalCalories = foods.reduce((sum: number, f: any) => sum + (f.calories || 0), 0)
    const totalProtein = foods.reduce((sum: number, f: any) => sum + (f.protein || 0), 0)
    const totalCarbs = foods.reduce((sum: number, f: any) => sum + (f.carbs || 0), 0)
    const totalFat = foods.reduce((sum: number, f: any) => sum + (f.fat || 0), 0)

    const meal = await MealLog.create({
      userId: tokenUser.userId,
      mealType,
      foods,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      date: new Date(),
    })

    return NextResponse.json(meal, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
