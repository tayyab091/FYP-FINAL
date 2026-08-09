'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { PLANS, type PlanId } from '@/lib/plans'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

function isClientStripeReady(): boolean {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) return false
  const normalized = key.trim().toUpperCase()
  return (
    key.startsWith('pk_') &&
    !normalized.includes('PASTE_') &&
    !normalized.includes('REPLACE') &&
    !normalized.endsWith('_HERE')
  )
}

function SubscriptionReturnHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshUser } = useAuth()

  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    if (!success && !canceled) return

    if (success === 'true') {
      const plan = searchParams.get('plan')
      const sessionId = searchParams.get('session_id')
      const planName = PLANS.find(p => p.id === plan)?.name || 'Pro'

      void (async () => {
        try {
          if (sessionId) {
            const res = await fetch(
              `/api/subscription/confirm?session_id=${encodeURIComponent(sessionId)}`,
            )
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              throw new Error(data.message || 'Could not confirm payment')
            }
          }
          await refreshUser()
          toast.success(`${planName} plan activated!`)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not confirm payment')
        } finally {
          router.replace('/subscription')
        }
      })()
      return
    }

    if (canceled === 'true') {
      toast.info('Payment canceled. No charges were made.')
      router.replace('/subscription')
    }
  }, [searchParams, refreshUser, router])

  return null
}

export default function SubscriptionPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth()
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const [processing, setProcessing] = useState(false)
  const stripeReady = isClientStripeReady()

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
    if (!selectedPlan || selectedPlan === 'basic') return
    setProcessing(true)
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      if (data.url) {
        window.location.href = data.url
        return
      }

      if (data.simulated || data.success) {
        await refreshUser()
        const planName = PLANS.find((p) => p.id === selectedPlan)?.name || 'Pro'
        toast.success(`Plan activated! Welcome to ${planName}!`)
        setModalOpen(false)
        setSelectedPlan(null)
        return
      }

      throw new Error(data.message || 'Payment failed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  const getButtonLabel = (plan: typeof PLANS[0]) => {
    if (plan.id === currentPlan && user) return 'Current Plan'
    return plan.cta
  }

  const selectedPlanDetails = PLANS.find(p => p.id === selectedPlan)

  return (
    <div className="min-h-screen pt-8 pb-24 px-6">
      <Suspense fallback={null}>
        <SubscriptionReturnHandler />
      </Suspense>

      <div className="max-w-6xl mx-auto">
        <div className="page-hero text-center mb-12 px-6 py-12 sm:px-10 md:py-16">
          <p className="eyebrow mb-3">Invest in your strongest self</p>
          <h1 className="display-title text-balance text-4xl md:text-6xl text-foreground mb-5">A Plan for Every Ambition</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Unlock personalized workouts, meal plans, and expert coaching.
          </p>
          {user && !authLoading && (
            <p className="mt-4 text-sm text-muted-foreground">
              Current plan: <span className="text-primary font-bold capitalize">{currentPlan}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isCurrent = !authLoading && user && plan.id === currentPlan
            return (
              <div key={plan.id}
                className={`interactive-lift relative rounded-2xl p-8 flex flex-col transition-all ${
                  plan.highlighted
                    ? 'border border-primary/45 bg-primary/[.055] shadow-[0_24px_80px_rgba(34,245,154,.1)] md:-translate-y-3'
                    : 'elite-panel'
                }`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-4 right-4">
                    <span className="text-xs bg-white/10 text-primary border border-primary/30 px-2 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                <h2 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h2>
                <div className="mb-6">
                  <span className={`text-5xl font-black ${plan.highlighted ? 'text-primary' : 'text-foreground'}`}>
                    {plan.price}
                  </span>
                  {plan.period && <span className="text-muted-foreground text-lg">{plan.period}</span>}
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="text-primary">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => openModal(plan.id)}
                  disabled={!!isCurrent || authLoading}
                  className={`w-full text-sm disabled:opacity-50 ${
                    plan.highlighted && !isCurrent
                      ? 'btn-accent'
                      : isCurrent
                        ? 'btn-outline cursor-default opacity-60'
                        : 'btn-outline'
                  }`}>
                  {authLoading ? 'Loading...' : getButtonLabel(plan)}
                </button>
              </div>
            )
          })}
        </div>

        {!user && !authLoading && (
          <p className="text-center text-muted-foreground text-sm mt-8">
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
            {' '}to see your current plan
          </p>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => !processing && setModalOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{stripeReady ? 'Secure Checkout' : 'Payment Simulation'}</DialogTitle>
            <DialogDescription>
              {stripeReady
                ? 'You will be redirected to Stripe to complete your payment securely.'
                : 'This is a demo payment. Click confirm to activate your plan instantly.'}
            </DialogDescription>
          </DialogHeader>

          <div className="elite-panel space-y-2 rounded-xl p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium capitalize text-foreground">{selectedPlan}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-primary">
                {selectedPlanDetails?.price}
                {selectedPlanDetails?.period}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={processing}>
              {processing
                ? 'Processing...'
                : stripeReady
                  ? 'Continue to Stripe'
                  : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
