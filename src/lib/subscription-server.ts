import User from '@/models/User'
import type { PlanId } from '@/lib/plans'
import { createNotification } from '@/lib/notifications'
import { addMonths } from '@/lib/calendar'
export { addMonths } from '@/lib/calendar'
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
export async function activateUserPlan(userId: string, plan: 'pro' | 'elite', payment: { id: string; created: number }) {
  // The purchased term is tied to the payment, never to a replayed confirmation.
  const startDate = new Date(payment.created * 1000)
  const endDate = addMonths(startDate, 1)
  if (!Number.isFinite(startDate.getTime()) || endDate <= new Date()) {
    return User.findById(userId).select('-password')
  }

  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      stripeSubscriptionId: { $exists: false },
      $or: [
        { lastStripeCheckoutCreatedAt: { $exists: false } },
        { lastStripeCheckoutCreatedAt: { $lt: startDate } },
      ],
    },
    {
      lastStripeCheckoutId: payment.id,
      lastStripeCheckoutCreatedAt: startDate,
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

  return user || User.findById(userId).select('-password')
}

/** Admin: assign a plan (manual / support). Default term is 1 month for paid plans. */
export async function adminAssignSubscription(
  userId: string,
  plan: PlanId,
  months = 1,
) {
  const startDate = new Date()
  const term = Math.max(1, Math.min(36, Math.floor(months) || 1))
  const subscription =
    plan === 'basic'
      ? { plan: 'basic' as const, status: 'active' as const, startDate, endDate: undefined }
      : {
          plan,
          status: 'active' as const,
          startDate,
          endDate: addMonths(startDate, term),
        }

  return User.findByIdAndUpdate(
    userId,
    { subscription },
    { new: true, runValidators: true },
  ).select('-password')
}

/** Admin: revoke paid access — basic + inactive (canceled), clear end date. */
export async function adminRevokeSubscription(userId: string) {
  const existing = await User.findById(userId).select('subscription')
  if (!existing) return null

  return User.findByIdAndUpdate(
    userId,
    {
      subscription: {
        plan: 'basic',
        status: 'inactive',
        startDate: existing.subscription?.startDate || new Date(),
        endDate: undefined,
      },
    },
    { new: true, runValidators: true },
  ).select('-password')
}

/** Admin: renew/extend — push endDate by N months, keep current plan. */
export async function adminExtendSubscription(userId: string, months = 1) {
  const existing = await User.findById(userId).select('subscription')
  if (!existing) return null

  const plan = normalizePlan(existing.subscription?.plan)
  const term = Math.max(1, Math.min(36, Math.floor(months) || 1))
  const now = new Date()
  const currentEnd = existing.subscription?.endDate
    ? new Date(existing.subscription.endDate)
    : null
  const base = currentEnd && currentEnd > now ? currentEnd : now

  return User.findByIdAndUpdate(
    userId,
    {
      subscription: {
        plan,
        status: 'active',
        startDate: existing.subscription?.startDate || now,
        endDate: addMonths(base, term),
      },
    },
    { new: true, runValidators: true },
  ).select('-password')
}
