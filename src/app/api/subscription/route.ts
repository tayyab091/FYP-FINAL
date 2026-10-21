import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { getUser } from '@/lib/auth'
import {
  getAppBaseUrl,
  getPaidPlanAmountCents,
  getStripe,
  isStripeConfigured,
} from '@/lib/stripe'

const PAID_PLANS = ['pro', 'elite'] as const

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })

    await connectDB()
    const { plan } = (await req.json()) as { plan?: string }

    if (!plan || !['basic', 'pro', 'elite'].includes(plan)) {
      return NextResponse.json({ message: 'Invalid plan' }, { status: 400 })
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
        })
        if (session.url) {
          return NextResponse.json({ url: session.url, mode: 'stripe' })
        }
      } catch (e) {
        console.error('Stripe error, falling back to simulation:', e)
      }
    }

    if (isStripeConfigured()) {
      try {
        const stripe = getStripe()
        const baseUrl = getAppBaseUrl(req.nextUrl.origin)
        const planLabel = plan === 'pro' ? 'Pro' : 'Elite'
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
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
        })
        if (session.url) {
          return NextResponse.json({ url: session.url, mode: 'stripe' })
        }
      } catch (e) {
        console.error('Stripe checkout error, falling back to simulation:', e)
      }
    }

    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)

    await User.findByIdAndUpdate(tokenUser.userId, {
      'subscription.plan': plan,
      'subscription.status': 'active',
      'subscription.startDate': new Date(),
      'subscription.endDate': endDate,
    })

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
    const user = await User.findById(tokenUser.userId).select('subscription').lean()
    return NextResponse.json({
      subscription: user?.subscription || { plan: 'basic', status: 'active' },
      stripeEnabled: isStripeConfigured(),
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
