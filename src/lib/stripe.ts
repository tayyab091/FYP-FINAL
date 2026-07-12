import Stripe from 'stripe'
import type { PlanId } from '@/lib/plans'

const PAID_PLAN_AMOUNTS: Record<Exclude<PlanId, 'basic'>, number> = {
  pro: 1900,
  elite: 3900,
}

function looksLikePlaceholder(key: string): boolean {
  const normalized = key.trim().toUpperCase()
  return (
    normalized.length === 0 ||
    normalized.includes('PASTE_') ||
    normalized.includes('REPLACE') ||
    normalized.includes('YOUR_') ||
    normalized.endsWith('_HERE')
  )
}

export function isStripeSecretConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY
  return !!key && key.startsWith('sk_') && !looksLikePlaceholder(key)
}

export function isStripePublishableConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  return !!key && key.startsWith('pk_') && !looksLikePlaceholder(key)
}

export function isStripeConfigured(): boolean {
  return isStripeSecretConfigured() && isStripePublishableConfigured()
}

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!isStripeSecretConfigured()) {
    throw new Error('Stripe secret key is not configured')
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-06-24.dahlia',
    })
  }
  return stripeClient
}

export function getPaidPlanAmountCents(plan: Exclude<PlanId, 'basic'>): number {
  return PAID_PLAN_AMOUNTS[plan]
}

export function getAppBaseUrl(fallbackOrigin?: string): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    fallbackOrigin?.replace(/\/$/, '') ||
    'http://localhost:3000'
  )
}
