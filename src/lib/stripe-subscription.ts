import type Stripe from 'stripe'
import User from '@/models/User'
import { connectDB } from './mongodb'
import { getStripe } from './stripe'

export async function syncStripeSubscription(input: Stripe.Subscription | string, checkout?: { userId: string; plan: 'pro' | 'elite' }) {
  const subscription = await getStripe().subscriptions.retrieve(typeof input === 'string' ? input : input.id)
  if (checkout && subscription.metadata.userId && subscription.metadata.userId !== checkout.userId) return null
  const userId = subscription.metadata.userId || checkout?.userId
  const plan = subscription.metadata.plan || checkout?.plan
  if (checkout && !subscription.metadata.userId) {
    await getStripe().subscriptions.update(subscription.id, { metadata: checkout })
  }
  await connectDB()
  const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const user = await User.findOne({
    $or: [
      { stripeSubscriptionId: subscription.id },
      ...(userId ? [{ _id: userId }] : []),
    ],
  }).select('subscription stripeSubscriptionId lastStripeSubscriptionCreated').lean()
  if (!user) return null
  if (user.lastStripeSubscriptionCreated && user.lastStripeSubscriptionCreated > subscription.created) return null
  if (user.stripeSubscriptionId && user.stripeSubscriptionId !== subscription.id && user.subscription?.plan !== 'basic') return null
  if (plan !== 'pro' && plan !== 'elite') return null
  const item = subscription.items.data[0]
  const active = ['active', 'trialing'].includes(subscription.status)
  return User.findByIdAndUpdate(user._id, {
    $set: {
      lastStripeSubscriptionCreated: subscription.created,
      lastStripeCheckoutCreatedAt: new Date(subscription.created * 1000),
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customer,
      subscription: {
        plan: active ? plan : 'basic', status: 'active',
        startDate: item ? new Date(item.current_period_start * 1000) : new Date(subscription.start_date * 1000),
        endDate: item ? new Date(item.current_period_end * 1000) : undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    },
  }, { new: true })
}
