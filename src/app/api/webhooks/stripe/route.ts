import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { connectDB } from '@/lib/mongodb'
import { activateUserPlan } from '@/lib/subscription'
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
  const user = await activateUserPlan(userId, plan)
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status === 'paid') {
      await handleCheckoutCompleted(session)
    }
  }

  return NextResponse.json({ received: true })
}
