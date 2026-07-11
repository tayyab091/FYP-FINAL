import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import WorkoutPlan from '@/models/WorkoutPlan'
import { getUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    await connectDB()

    // Deactivate existing active plans for this user
    const plan = await WorkoutPlan.findById(id)
    if (!plan) return NextResponse.json({ message: 'Plan not found' }, { status: 404 })

    await WorkoutPlan.updateMany(
      { userId: plan.userId, status: 'active' },
      { status: 'completed' }
    )

    plan.status = 'active'
    plan.startDate = new Date()
    await plan.save()

    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
