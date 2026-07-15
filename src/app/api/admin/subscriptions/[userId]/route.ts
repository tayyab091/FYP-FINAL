import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import AuditLog from '@/models/AuditLog'
import { getUser } from '@/lib/auth'
import type { PlanId } from '@/lib/plans'
import { normalizePlan } from '@/lib/subscription'
import {
  adminAssignSubscription,
  adminExtendSubscription,
  adminRevokeSubscription,
} from '@/lib/subscription-server'

const ACTIONS = ['grant', 'revoke', 'renew', 'set'] as const
type SubscriptionAction = (typeof ACTIONS)[number]

function isAction(value: unknown): value is SubscriptionAction {
  return typeof value === 'string' && (ACTIONS as readonly string[]).includes(value)
}

function parseMonths(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.min(36, Math.floor(value)))
  }
  return 1
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const tokenUser = await getUser(req)
    if (!tokenUser) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    if (!['admin', 'super_admin'].includes(tokenUser.role)) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const { userId } = await params
    const body = await req.json()
    const action = body?.action
    if (!isAction(action)) {
      return NextResponse.json(
        { message: "action must be 'grant' | 'revoke' | 'renew' | 'set'" },
        { status: 400 },
      )
    }

    const months = parseMonths(body?.months)

    await connectDB()
    const target = await User.findById(userId).select('fullName email role subscription')
    if (!target) return NextResponse.json({ message: 'User not found' }, { status: 404 })
    if (['admin', 'super_admin'].includes(target.role)) {
      return NextResponse.json(
        { message: 'Cannot change admin account subscriptions' },
        { status: 403 },
      )
    }

    const previous = {
      plan: normalizePlan(target.subscription?.plan),
      status: target.subscription?.status === 'inactive' ? 'inactive' : 'active',
      startDate: target.subscription?.startDate ?? null,
      endDate: target.subscription?.endDate ?? null,
    }

    let updated = null
    let auditAction = ''
    let plan: PlanId = previous.plan

    if (action === 'grant' || action === 'set') {
      if (action === 'grant') {
        const requested = body?.plan
        if (requested !== 'pro' && requested !== 'elite') {
          return NextResponse.json(
            { message: "grant requires plan 'pro' or 'elite'" },
            { status: 400 },
          )
        }
        plan = requested
      } else {
        plan = normalizePlan(body?.plan)
      }
      updated = await adminAssignSubscription(userId, plan, months)
      auditAction = action === 'grant' ? 'SUBSCRIPTION_GRANTED' : 'SUBSCRIPTION_SET'
    } else if (action === 'revoke') {
      updated = await adminRevokeSubscription(userId)
      plan = 'basic'
      auditAction = 'SUBSCRIPTION_REVOKED'
    } else {
      updated = await adminExtendSubscription(userId, months)
      plan = normalizePlan(updated?.subscription?.plan)
      auditAction = 'SUBSCRIPTION_RENEWED'
    }

    if (!updated) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    await AuditLog.create({
      adminId: tokenUser.userId,
      action: auditAction,
      targetId: updated._id,
      targetModel: 'User',
      details: {
        email: target.email,
        fullName: target.fullName,
        action,
        plan,
        months,
        previous,
        subscription: updated.subscription,
        note: 'Manual admin override (platform DB only; not synced to Stripe)',
      },
    })

    return NextResponse.json({
      message: `Subscription ${action} applied`,
      user: {
        _id: updated._id,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        subscription: updated.subscription,
      },
    })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
