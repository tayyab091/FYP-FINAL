import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { getUser } from '@/lib/auth'
import {
  getAppBaseUrl,
  getPaidPlanAmountCents,
  getStripe,
  isStripeConfigured,
  canSimulatePayments,
} from '@/lib/stripe'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/validation'
import { addMonths } from '@/lib/calendar'
import { createNotification } from '@/lib/notifications'
import { syncStripeSubscription } from '@/lib/stripe-subscription'
import { resolveSubscriptionFromUser } from '@/lib/subscription'

const subscriptionSchema = z.object({ plan: z.enum(['basic', 'pro', 'elite']) })

const manageSchema = z.object({ action: z.enum(['cancel', 'resume', 'portal']) })

export async function PATCH(req: NextRequest) {
  try {
    const member = await getUser(req)
    if (!member) return NextResponse.json({ message: 'Sign in to manage your subscription' }, { status: 401 })
    if (member.role !== 'user') return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    const parsed = await parseJsonBody(req, manageSchema)
    if ('error' in parsed) return parsed.error
    await connectDB()
    const user = await User.findById(member.userId).select('subscription stripeSubscriptionId stripeCustomerId').lean()
    if (!user) return NextResponse.json({ message: 'Account not found' }, { status: 404 })
    if (user.stripeSubscriptionId) {
      const stripe = getStripe()
      if (parsed.data.action === 'portal') {
        if (!user.stripeCustomerId) return NextResponse.json({ message: 'Billing customer not found' }, { status: 409 })
        const portal = await stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: getAppBaseUrl(req.nextUrl.origin) + '/subscription' })
        return NextResponse.json({ url: portal.url })
      }
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: parsed.data.action === 'cancel' })
      await syncStripeSubscription(subscription)
    } else {
      if (!user.subscription?.endDate || new Date(user.subscription.endDate) <= new Date()) {
        return NextResponse.json({ message: 'Choose a plan to renew your expired membership.' }, { status: 409 })
      }
      if (parsed.data.action === 'portal') return NextResponse.json({ message: 'This membership has no recurring billing account.' }, { status: 409 })
      await User.updateOne({ _id: member.userId }, { $set: { 'subscription.cancelAtPeriodEnd': parsed.data.action === 'cancel' } })
    }
    const message = parsed.data.action === 'cancel' ? 'Cancellation scheduled. Access continues until the paid term ends.' : 'Your subscription will continue.'
    await createNotification({ userId: member.userId, title: 'Subscription updated', message, type: 'payment', link: '/subscription' }).catch(() => {})
    return NextResponse.json({ success: true, message })
  } catch {
    return NextResponse.json({ message: 'Unable to update billing. Please try again.' }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const parsed = await parseJsonBody(req, subscriptionSchema)
    if ('error' in parsed) return parsed.error
    const { plan } = parsed.data
    await connectDB()

    if (plan !== 'basic' && !isStripeConfigured() && !canSimulatePayments()) {
      return NextResponse.json({ message: 'Payments are not configured. Please contact support.' }, { status: 503 })
    }
    const existing = await User.findById(tokenUser.userId).select('subscription stripeSubscriptionId stripeCustomerId').lean()
    if (existing?.stripeSubscriptionId && existing.subscription?.plan !== 'basic') {
      return NextResponse.json({ message: 'Manage your current recurring subscription before starting another plan.' }, { status: 409 })
    }
    if (plan === 'basic') {
      await User.findByIdAndUpdate(tokenUser.userId, {
        'subscription.plan': 'basic',
        'subscription.status': 'active',
        'subscription.startDate': new Date(),
        $unset: { 'subscription.endDate': 1 },
      })
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Successfully upgraded to basic plan',
        plan: 'basic',
      })
    }

    const paidUntil = existing?.subscription?.plan === plan && existing.subscription?.endDate
      ? new Date(existing.subscription.endDate).getTime() : 0
    const carryover = paidUntil > Date.now() + 48 * 60 * 60 * 1000
      ? { trial_end: Math.floor(paidUntil / 1000) }
      : paidUntil > Date.now()
        ? { billing_cycle_anchor: Math.floor(paidUntil / 1000), proration_behavior: 'none' as const }
        : {}
    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
    const priceId =
      plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_ELITE_PRICE_ID

    if (
      STRIPE_KEY &&
      !STRIPE_KEY.includes('PASTE') &&
      isStripeConfigured() &&
      priceId &&
      !priceId.includes('PASTE')
    ) {
      try {
        const stripe = getStripe()
        const baseUrl = getAppBaseUrl(req.nextUrl.origin)
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${baseUrl}/subscription?success=true&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/subscription?cancelled=true`,
          customer_email: tokenUser.email,
          metadata: { userId: tokenUser.userId, plan },
          subscription_data: { metadata: { userId: tokenUser.userId, plan }, ...carryover },
        })
        if (session.url) {
          return NextResponse.json({ url: session.url, mode: 'stripe' })
        }
      } catch (e) {
        console.error('Stripe checkout error:', e)
        return NextResponse.json({ message: 'Checkout is unavailable. Please try again later.' }, { status: 502 })
      }
      return NextResponse.json({ message: 'Checkout did not return a payment URL.' }, { status: 502 })
    }

    if (isStripeConfigured()) {
      try {
        const stripe = getStripe()
        const baseUrl = getAppBaseUrl(req.nextUrl.origin)
        const planLabel = plan === 'pro' ? 'Pro' : 'Elite'
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                recurring: { interval: 'month' },
                unit_amount: getPaidPlanAmountCents(plan as 'pro' | 'elite'),
                product_data: {
                  name: `T.E.S.T. Fitness — ${planLabel}`,
                  description: `Monthly ${planLabel} membership`,
                },
              },
              quantity: 1,
            },
          ],
          success_url: `${baseUrl}/subscription?success=true&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/subscription?cancelled=true`,
          customer_email: tokenUser.email,
          metadata: { userId: tokenUser.userId, plan },
          subscription_data: { metadata: { userId: tokenUser.userId, plan }, ...carryover },
        })
        if (session.url) {
          return NextResponse.json({ url: session.url, mode: 'stripe' })
        }
      } catch (e) {
        console.error('Stripe checkout error:', e)
        return NextResponse.json({ message: 'Checkout is unavailable. Please try again later.' }, { status: 502 })
      }
      return NextResponse.json({ message: 'Checkout did not return a payment URL.' }, { status: 502 })
    }

    if (!canSimulatePayments()) {
      return NextResponse.json({ message: 'Payments are not configured. Please contact support.' }, { status: 503 })
    }

    const currentEnd = existing?.subscription?.plan === plan && existing?.subscription?.endDate
      ? new Date(existing.subscription.endDate) : new Date()
    const endDate = addMonths(new Date(Math.max(Date.now(), currentEnd.getTime())), 1)

    await User.findByIdAndUpdate(tokenUser.userId, {
      'subscription.plan': plan,
      'subscription.status': 'active',
      'subscription.startDate': new Date(),
      'subscription.endDate': endDate,
      'subscription.cancelAtPeriodEnd': false,
    })

    await createNotification({ userId: tokenUser.userId, title: 'Subscription renewed', message: 'Your membership is active through ' + endDate.toLocaleDateString(), type: 'payment', link: '/subscription' }).catch(() => {})
    return NextResponse.json({
      success: true,
      simulated: true,
      message: `Successfully upgraded to ${plan} plan`,
      plan,
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    await connectDB()
    const user = await User.findById(tokenUser.userId).select('subscription stripeSubscriptionId stripeCustomerId').lean()
    return NextResponse.json({
      subscription: user ? resolveSubscriptionFromUser(user) : { plan: 'basic', status: 'active' },
      recurring: Boolean(user?.stripeSubscriptionId),
      stripeEnabled: isStripeConfigured(),
      simulationEnabled: canSimulatePayments(),
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
