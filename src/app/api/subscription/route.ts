import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { activateUserPlan } from '@/lib/subscription'
import {
  getAppBaseUrl,
  getPaidPlanAmountCents,
  getStripe,
  isStripeConfigured,
} from '@/lib/stripe'

const PAID_PLANS = ['pro', 'elite'] as const
type PaidPlanId = (typeof PAID_PLANS)[number]

function isPaidPlan(plan: string): plan is PaidPlanId {
  return PAID_PLANS.includes(plan as PaidPlanId)
}

export async function GET() {
  return NextResponse.json({ stripeEnabled: isStripeConfigured() })
}

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const { plan } = await req.json()
    if (!isPaidPlan(plan)) {
      return NextResponse.json({ message: 'Invalid subscription plan' }, { status: 400 })
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ mode: 'simulated' })
    }

    await connectDB()
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
            unit_amount: getPaidPlanAmountCents(plan),
            product_data: {
              name: `T.E.S.T. Fitness — ${planLabel}`,
              description: `Monthly ${planLabel} membership`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/subscription?success=true&plan=${plan}`,
      cancel_url: `${baseUrl}/subscription?canceled=true`,
      customer_email: tokenUser.email,
      metadata: {
        userId: tokenUser.userId,
        plan,
      },
    })

    if (!session.url) {
      return NextResponse.json({ message: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({
      mode: 'stripe',
      url: session.url,
      sessionId: session.id,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

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
    if (!isPaidPlan(plan) || simulatedPayment !== true) {
      return NextResponse.json({ message: 'Invalid subscription request' }, { status: 400 })
    }

    await connectDB()
    const user = await activateUserPlan(tokenUser.userId, plan)
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    return NextResponse.json({
      message: `${plan === 'pro' ? 'Pro' : 'Elite'} activated`,
      subscription: user.subscription,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
