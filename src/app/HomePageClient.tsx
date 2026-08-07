'use client'

import { Suspense, lazy, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useReducedMotion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { ScrollProgress } from '@/components/motion'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingLoader } from '@/components/landing/LandingLoader'
import { LandingMarquee } from '@/components/landing/LandingMarquee'
import { LandingAbout } from '@/components/landing/LandingAbout'
import { LandingStats } from '@/components/landing/LandingStats'
import { LandingPillars } from '@/components/landing/LandingPillars'
import { LandingFeatures } from '@/components/landing/LandingFeatures'
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks'
import { LandingTestimonial } from '@/components/landing/LandingTestimonial'
import { LandingPricing } from '@/components/landing/LandingPricing'
import { LandingCta } from '@/components/landing/LandingCta'
import { LandingTrainersBoundary } from '@/components/landing/LandingTrainersBoundary'

const LandingTrainers = lazy(() =>
  import('@/components/landing/LandingTrainers').then((m) => ({ default: m.LandingTrainers }))
)

function TrainersFallback() {
  return (
    <div className="landing-section landing-section--alt" aria-hidden>
      <div className="landing-container">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/40" />
        <div className="mt-8 flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 w-64 shrink-0 animate-pulse rounded-2xl bg-muted/30" />
          ))}
        </div>
      </div>
    </div>
  )
}

function GuestLanding() {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <>
      <LandingLoader />
      <div className={`landing-page${reduceMotion ? ' landing-page--reduced' : ''}`}>
        <div className="landing-scroll-progress">
          <ScrollProgress />
        </div>
        <LandingHero />
        <LandingMarquee />
        <LandingAbout />
        <LandingStats />
        <LandingPillars />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingTrainersBoundary>
          <Suspense fallback={<TrainersFallback />}>
            <LandingTrainers />
          </Suspense>
        </LandingTrainersBoundary>
        <LandingTestimonial />
        <LandingPricing />
        <LandingCta />
      </div>
    </>
  )
}

function HomeLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function HomePageContent() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const allowMarketing = searchParams.get('marketing') === '1'

  useEffect(() => {
    if (isLoading || !user || allowMarketing) return
    switch (user.role) {
      case 'admin':
      case 'super_admin':
        router.replace('/admin')
        break
      case 'trainer':
        router.replace('/trainer-dashboard')
        break
      case 'gym_owner':
        router.replace('/gym-owner')
        break
      default:
        router.replace('/dashboard')
    }
  }, [isLoading, user, router, allowMarketing])

  if (isLoading || (user && !allowMarketing)) {
    return <HomeLoading />
  }

  return <GuestLanding />
}

export default function HomePageClient() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomePageContent />
    </Suspense>
  )
}
