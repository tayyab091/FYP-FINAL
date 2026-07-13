import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getUser } from '@/lib/auth'
import { activateUserPlan } from '@/lib/subscription'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

function isPaidPlan(plan: string | undefined): plan is 'pro' | 'elite' {
  return plan === 'pro' || plan === 'elite'
}

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }
    if (tokenUser.role !== 'user') {
      return NextResponse.json({ message: 'Member account required' }, { status: 403 })
    }

    const sessionId = req.nextUrl.searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ message: 'session_id is required' }, { status: 400 })
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ message: 'Stripe is not configured' }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ message: 'Payment not completed' }, { status: 400 })
    }

    const metaUserId = session.metadata?.userId
    const plan = session.metadata?.plan

    if (!metaUserId || metaUserId !== tokenUser.userId) {
      return NextResponse.json({ message: 'Session does not match this account' }, { status: 403 })
    }
    if (!isPaidPlan(plan)) {
      return NextResponse.json({ message: 'Invalid plan on session' }, { status: 400 })
    }

    await connectDB()
    const user = await activateUserPlan(tokenUser.userId, plan)
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: `${plan === 'pro' ? 'Pro' : 'Elite'} activated`,
      subscription: user.subscription,
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
