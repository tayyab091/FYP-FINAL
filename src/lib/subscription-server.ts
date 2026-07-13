import User from '@/models/User'
import { createNotification } from '@/lib/notifications'
import {
  normalizePlan,
  resolveSubscriptionFromUser,
  type ResolvedSubscription,
} from '@/lib/subscription'

/** Downgrade expired paid plans in the database and return the effective subscription. */
export async function syncUserSubscription(userId: string): Promise<ResolvedSubscription | null> {
  const user = await User.findById(userId).select('subscription').lean()
  if (!user) return null

  const resolved = resolveSubscriptionFromUser(user)
  const storedPlan = normalizePlan(user.subscription?.plan)
  const endDate = user.subscription?.endDate ? new Date(user.subscription.endDate) : undefined

  if (storedPlan !== 'basic' && endDate && endDate < new Date()) {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          subscription: {
            plan: 'basic',
            status: 'active',
            startDate: user.subscription?.startDate,
            endDate: undefined,
          },
        },
      },
    )
  }

  return resolved
}

/** Activate a paid plan. Safe to call from webhook and confirm — skips if already active. */
export async function activateUserPlan(userId: string, plan: 'pro' | 'elite') {
  const existing = await User.findById(userId).select('subscription')
  if (!existing) return null

  const currentEnd = existing.subscription?.endDate
    ? new Date(existing.subscription.endDate)
    : undefined
  const alreadyActive =
    existing.subscription?.plan === plan &&
    existing.subscription?.status === 'active' &&
    !!currentEnd &&
    currentEnd > new Date()

  if (alreadyActive) {
    return User.findById(userId).select('-password')
  }

  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + 1)

  const user = await User.findByIdAndUpdate(
    userId,
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

  if (user) {
    const planLabel = plan === 'pro' ? 'Pro' : 'Elite'
    await createNotification({
      userId,
      title: `${planLabel} plan activated`,
      message: `Your ${planLabel} plan is active`,
      type: 'payment',
      link: '/subscription',
    })
  }

  return user
}
