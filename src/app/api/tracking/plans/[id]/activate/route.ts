import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import WorkoutPlan from '@/models/WorkoutPlan'
import Trainer from '@/models/Trainer'
import User from '@/models/User'
import { getUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    await connectDB()

    // Deactivate existing active plans for this user
    const plan = await WorkoutPlan.findById(id)
    if (!plan) return NextResponse.json({ message: 'Plan not found' }, { status: 404 })

    const isAssignedUser = plan.userId.toString() === tokenUser.userId
    let isOwningTrainer = false
    if (tokenUser.role === 'trainer') {
      const trainer = await Trainer.findOne({ userId: tokenUser.userId }).select('_id')
      isOwningTrainer = Boolean(trainer && plan.trainerId?.toString() === trainer._id.toString())
    }
    if (!isAssignedUser && !isOwningTrainer) {
      return NextResponse.json({ message: 'Not authorized to activate this plan' }, { status: 403 })
    }

    const wasInactive = plan.status !== 'active'

    await WorkoutPlan.updateMany(
      { userId: plan.userId, status: 'active' },
      { status: 'completed' }
    )

    plan.status = 'active'
    plan.startDate = new Date()
    await plan.save()

    // Notify client when a trainer activates/assigns the plan
    if (wasInactive && isOwningTrainer && plan.userId.toString() !== tokenUser.userId) {
      try {
        const trainerUser = await User.findById(tokenUser.userId).select('fullName').lean()
        const trainerName = trainerUser?.fullName || 'Your trainer'
        await createNotification({
          userId: plan.userId,
          title: 'Workout plan assigned',
          message: `${trainerName} assigned you “${plan.title}”`,
          type: 'workout',
          link: '/my-fitness',
        })
      } catch (notifyError) {
        console.error('Workout plan notify error:', notifyError)
      }
    }

    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
