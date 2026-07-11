'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

type PlanId = 'basic' | 'pro' | 'elite'

const PLANS = [
  {
    id: 'basic' as const,
    name: 'Basic',
    price: 'Free',
    period: '',
    features: ['3 workouts/week', 'Basic nutrition guides', 'Community access', '5 free trainer chats'],
    highlighted: false,
    cta: 'Get Started Free',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$19',
    period: '/mo',
    features: ['Unlimited workouts', 'Personalised meal plans', '1-on-1 trainer chat', 'Advanced analytics', 'AI form checker'],
    highlighted: true,
    cta: 'Upgrade to Pro',
  },
  {
    id: 'elite' as const,
    name: 'Elite',
    price: '$39',
    period: '/mo',
    features: ['Everything in Pro', 'Live training sessions', 'Priority support', 'Custom meal plans', 'Unlimited trainer connections'],
    highlighted: false,
    cta: 'Get Elite',
  },
]

export default function SubscriptionPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const [processing, setProcessing] = useState(false)

  const currentPlan: PlanId = (user?.subscription?.plan as PlanId) || 'basic'

  const openModal = (planId: PlanId) => {
    if (planId === 'basic') {
      if (!user) router.push('/signup')
      return
    }
    if (!user) {
      router.push('/login?redirect=/subscription')
      return
    }
    if (planId === currentPlan) return
    setSelectedPlan(planId)
    setModalOpen(true)
  }

  const handleConfirmPayment = async () => {
    if (!selectedPlan) return
    setProcessing(true)
    await new Promise(r => setTimeout(r, 1200))
    const planName = PLANS.find(p => p.id === selectedPlan)?.name || 'Pro'
    toast.success(`Payment simulated! ${planName} activated.`)
    setModalOpen(false)
    setSelectedPlan(null)
    setProcessing(false)
  }

  const getButtonLabel = (plan: typeof PLANS[0]) => {
    if (plan.id === currentPlan && user) return 'Current Plan'
    return plan.cta
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#00ff87] text-sm font-semibold uppercase tracking-widest mb-2">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Choose Your Plan</h1>
          <p className="text-[#a0a0a0] max-w-2xl mx-auto">
            Unlock personalized workouts, meal plans, and expert coaching.
          </p>
          {user && !authLoading && (
            <p className="mt-4 text-sm text-[#a0a0a0]">
              Current plan: <span className="text-[#00ff87] font-bold capitalize">{currentPlan}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isCurrent = !authLoading && user && plan.id === currentPlan
            return (
              <div key={plan.id}
                className={`relative rounded-2xl p-8 flex flex-col transition-all ${
                  plan.highlighted
                    ? 'border-2 border-[#00ff87] glass shadow-lg shadow-[#00ff87]/10 md:scale-105'
                    : 'glass hover:border-white/15'
                }`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#00ff87] text-black text-xs font-bold px-3 py-1 rounded-full uppercase">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-4 right-4">
                    <span className="text-xs bg-white/10 text-[#00ff87] border border-[#00ff87]/30 px-2 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
                <div className="mb-6">
                  <span className={`text-5xl font-black ${plan.highlighted ? 'text-[#00ff87]' : 'text-white'}`}>
                    {plan.price}
                  </span>
                  {plan.period && <span className="text-[#a0a0a0] text-lg">{plan.period}</span>}
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-[#c0c0c0]">
                      <span className="text-[#00ff87]">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => openModal(plan.id)}
                  disabled={!!isCurrent || authLoading}
                  className={`w-full py-3 rounded-full text-sm font-bold transition-all disabled:opacity-50 ${
                    plan.highlighted && !isCurrent
                      ? 'btn-accent'
                      : isCurrent
                        ? 'bg-white/5 text-[#a0a0a0] border border-white/10 cursor-default'
                        : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                  }`}>
                  {authLoading ? 'Loading...' : getButtonLabel(plan)}
                </button>
              </div>
            )
          })}
        </div>

        {!user && !authLoading && (
          <p className="text-center text-[#555] text-sm mt-8">
            <Link href="/login" className="text-[#00ff87] hover:underline">Sign in</Link>
            {' '}to see your current plan
          </p>
        )}
      </div>

      {modalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !processing && setModalOpen(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <button type="button" className="absolute top-4 right-4 text-[#a0a0a0] hover:text-white"
              onClick={() => !processing && setModalOpen(false)} disabled={processing}>✕</button>

            <h3 className="text-xl font-bold text-white mb-2">Payment Simulation</h3>
            <p className="text-[#a0a0a0] mb-6 text-sm">
              This is a demo payment. Click confirm to activate your plan instantly.
            </p>

            <div className="glass rounded-xl p-4 mb-6 border border-white/5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a0]">Plan</span>
                <span className="text-white font-medium capitalize">{selectedPlan}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a0]">Amount</span>
                <span className="text-[#00ff87] font-semibold">
                  {PLANS.find(p => p.id === selectedPlan)?.price}
                  {PLANS.find(p => p.id === selectedPlan)?.period}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} disabled={processing}
                className="flex-1 py-3 rounded-full border border-white/10 text-[#a0a0a0] hover:bg-white/5 text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleConfirmPayment} disabled={processing}
                className="flex-1 btn-accent py-3 text-sm font-bold disabled:opacity-50">
                {processing ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
