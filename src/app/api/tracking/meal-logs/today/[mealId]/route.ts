import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import MealLog from '@/models/MealLog'
import { getUser } from '@/lib/auth'
import { parseObjectIdParam } from '@/lib/validation'

type RouteContext = { params: Promise<{ mealId: string }> }

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const { mealId: rawId } = await params
    const idResult = parseObjectIdParam(rawId, 'meal id')
    if ('error' in idResult) return idResult.error

    await connectDB()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const deleted = await MealLog.findOneAndDelete({
      _id: idResult.id,
      userId: tokenUser.userId,
      date: { $gte: today, $lt: tomorrow },
    })

    if (!deleted) {
      return NextResponse.json({ message: 'Meal not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Meal deleted' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
