import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import User from '@/models/User'

export async function PUT(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const { plan, simulatedPayment } = await req.json()
    if (!['pro', 'elite'].includes(plan) || simulatedPayment !== true) {
      return NextResponse.json({ message: 'Invalid subscription request' }, { status: 400 })
    }

    await connectDB()
    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    const user = await User.findByIdAndUpdate(
      tokenUser.userId,
      {
        subscription: {
          plan,
          status: 'active',
          startDate,
          endDate,
        },
      },
      { new: true, runValidators: true },
    ).select('-password')
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    return NextResponse.json({
      message: `${plan === 'pro' ? 'Pro' : 'Elite'} activated`,
      subscription: user.subscription,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
