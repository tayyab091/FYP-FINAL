import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import WorkoutPlan from '@/models/WorkoutPlan'
import { getUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()
    const plan = await WorkoutPlan.findOne({
      userId: tokenUser.userId,
      status: 'active',
    }).lean()

    if (!plan) return NextResponse.json({ plan: null })
    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
