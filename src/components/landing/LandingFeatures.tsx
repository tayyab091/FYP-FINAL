'use client'

import Link from 'next/link'
import { useCallback, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { BENTO_FEATURES } from './constants'
import { LandingSection } from './LandingSection'
import { LandingReveal } from './LandingReveal'

function BentoCard({
  feature,
  reduceMotion,
}: {
  feature: (typeof BENTO_FEATURES)[number]
  reduceMotion: boolean
}) {
  const Icon = feature.icon
  const cardRef = useRef<HTMLAnchorElement>(null)

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLAnchorElement>) => {
      if (reduceMotion || !cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      cardRef.current.style.setProperty('--tilt-x', `${-y * 8}deg`)
      cardRef.current.style.setProperty('--tilt-y', `${x * 8}deg`)
    },
    [reduceMotion]
  )

  const resetTilt = useCallback(() => {
    if (!cardRef.current) return
    cardRef.current.style.setProperty('--tilt-x', '0deg')
    cardRef.current.style.setProperty('--tilt-y', '0deg')
  }, [])

  return (
    <Link
      ref={cardRef}
      href={feature.href}
      className="landing-bento__card"
      onPointerMove={handleMove}
      onPointerLeave={resetTilt}
    >
      <div className="landing-bento__card-shine" aria-hidden />
      <div className="landing-bento__card-top">
        <div className="landing-bento__icon">
          <Icon className="size-5" strokeWidth={2.2} />
        </div>
        <span className="landing-bento__metric">{feature.metric}</span>
      </div>
      <h3 className="landing-bento__title">{feature.title}</h3>
      <p className="landing-bento__desc">{feature.desc}</p>
      <span className="landing-bento__cta group">
        Explore
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

export function LandingFeatures() {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <LandingSection alt id="features" ariaLabel="Platform features">
      <LandingReveal className="landing-features__header">
        <p className="eyebrow mb-4 text-center">One connected ecosystem</p>
        <h2 className="display-title text-center text-3xl md:text-4xl lg:text-5xl">
          Your complete{' '}
          <span className="gradient-text">fitness stack</span>
        </h2>
      </LandingReveal>

      <div className="landing-bento">
        {BENTO_FEATURES.map((feature, i) => (
          <LandingReveal key={feature.id} delay={i * 0.08} className="landing-bento__cell">
            <BentoCard feature={feature} reduceMotion={reduceMotion} />
          </LandingReveal>
        ))}
      </div>
    </LandingSection>
  )
}
