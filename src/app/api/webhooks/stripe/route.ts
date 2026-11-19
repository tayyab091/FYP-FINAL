import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { connectDB } from '@/lib/mongodb'
import { activateUserPlan } from '@/lib/subscription-server'
import { syncStripeSubscription } from '@/lib/stripe-subscription'
import { createNotification } from '@/lib/notifications'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

function isPaidPlan(plan: string | undefined): plan is 'pro' | 'elite' {
  return plan === 'pro' || plan === 'elite'
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan

  if (!userId || !isPaidPlan(plan)) {
    console.error('Stripe webhook: missing or invalid session metadata', {
      userId,
      plan,
      sessionId: session.id,
    })
    return
  }

  await connectDB()
  const user = session.subscription
    ? await syncStripeSubscription(typeof session.subscription === 'string' ? session.subscription : session.subscription.id, { userId, plan })
    : await activateUserPlan(userId, plan, session)
  if (!user) {
    console.error('Stripe webhook: user not found', { userId, sessionId: session.id })
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ message: 'Webhook secret not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ message: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const body = await req.text()
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook payload'
    return NextResponse.json({ message }, { status: 400 })
  }

  try {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status === 'paid' || (session.payment_status === 'no_payment_required' && session.mode === 'subscription' && session.subscription)) {
      await handleCheckoutCompleted(session)
    }
  }

  if (['customer.subscription.updated', 'customer.subscription.deleted', 'customer.subscription.created'].includes(event.type)) {
    const subscription = event.data.object as Stripe.Subscription
    const user = await syncStripeSubscription(subscription)
    if (user && event.type !== 'customer.subscription.created') {
      await createNotification({
        userId: user._id, dedupKey: event.id, title: 'Subscription updated',
        message: subscription.cancel_at_period_end ? 'Your subscription will end after the current paid term.' : 'Your membership billing status has changed.',
        type: 'payment', link: '/subscription',
      }).catch(() => {})
    }
  }
  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const reference = invoice.parent?.subscription_details?.subscription
    if (reference) {
      const user = await syncStripeSubscription(typeof reference === 'string' ? reference : reference.id)
      if (user) await createNotification({
        userId: user._id, dedupKey: event.id, title: event.type === 'invoice.paid' ? 'Subscription renewed' : 'Subscription payment failed',
        message: event.type === 'invoice.paid' ? 'Your paid membership term is up to date.' : 'Update your billing details to restore paid features.',
        type: 'payment', link: '/subscription',
      }).catch(() => {})
    }
  }
  return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ message: 'Billing synchronization failed. Please retry this event.' }, { status: 503 })
  }
}
