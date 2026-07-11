export type PlanId = 'basic' | 'pro' | 'elite'

export interface SubscriptionPlan {
  id: PlanId
  name: string
  price: string
  period: string
  features: string[]
  highlighted: boolean
  cta: string
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 'Free',
    period: '',
    features: ['3 workouts/week', 'Basic nutrition guides', 'Community access', '5 free trainer chats'],
    highlighted: false,
    cta: 'Get Started Free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/mo',
    features: ['Unlimited workouts', 'Personalised meal plans', '1-on-1 trainer chat', 'Advanced analytics', 'AI form checker'],
    highlighted: true,
    cta: 'Upgrade to Pro',
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '$39',
    period: '/mo',
    features: ['Everything in Pro', 'Live training sessions', 'Priority support', 'Custom meal plans', 'Unlimited trainer connections'],
    highlighted: false,
    cta: 'Get Elite',
  },
]

export const PLANS = SUBSCRIPTION_PLANS

/** Home page pricing cards — derived from subscription plans for consistent copy */
export const MARKETING_PLANS = SUBSCRIPTION_PLANS.map(plan => ({
  name: plan.name,
  price: plan.period ? `${plan.price}${plan.period}` : plan.price,
  features: plan.features,
  highlight: plan.highlighted,
}))
