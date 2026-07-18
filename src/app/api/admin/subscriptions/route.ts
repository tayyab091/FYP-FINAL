import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { getUser } from '@/lib/auth'
import { normalizePlan, resolveSubscriptionFromUser } from '@/lib/subscription'

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(tokenUser.role)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    await connectDB()
    const users = await User.find({ role: { $nin: ['admin', 'super_admin'] } })
      .select('fullName email role subscription createdAt isSuspended isActive')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    const subscriptions = users.map((u) => {
      const resolved = resolveSubscriptionFromUser(u)
      const storedPlan = normalizePlan(u.subscription?.plan)
      const storedStatus = u.subscription?.status === 'inactive' ? 'inactive' : 'active'
      return {
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        isSuspended: u.isSuspended,
        isActive: u.isActive,
        createdAt: u.createdAt,
        subscription: {
          plan: storedPlan,
          status: storedStatus,
          startDate: u.subscription?.startDate ?? null,
          endDate: u.subscription?.endDate ?? null,
        },
        effective: {
          plan: resolved.plan,
          status: resolved.status,
          startDate: resolved.startDate ?? null,
          endDate: resolved.endDate ?? null,
        },
      }
    })

    const counts = { basic: 0, pro: 0, elite: 0 }
    for (const row of subscriptions) {
      counts[row.effective.plan] += 1
    }

    return NextResponse.json({
      subscriptions,
      counts,
      note: 'Admin grants update the platform database only and are not synced to Stripe.',
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
