'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HOW_IT_WORKS } from './constants'
import { LandingSection } from './LandingSection'
import { LandingReveal } from './LandingReveal'

export function LandingHowItWorks() {
  return (
    <LandingSection id="how-it-works" ariaLabel="How T.E.S.T. works">
      <LandingReveal className="landing-steps__header">
        <p className="eyebrow mb-4 text-center">How it works</p>
        <h2 className="display-title text-center text-3xl md:text-4xl lg:text-5xl">
          Three steps to{' '}
          <span className="gradient-text">thrive</span>
        </h2>
      </LandingReveal>

      <div className="landing-steps">
        <div className="landing-steps__line" aria-hidden />
        {HOW_IT_WORKS.map((step, i) => {
          const Icon = step.icon
          return (
            <LandingReveal key={step.step} delay={i * 0.1} className="landing-step">
              <div className="landing-step__marker">
                <Icon className="size-5" strokeWidth={2} />
              </div>
              <span className="landing-step__num">{step.step}</span>
              <h3 className="landing-step__title">{step.title}</h3>
              <p className="landing-step__desc">{step.desc}</p>
              <Link href={step.href} className="landing-step__link group">
                Learn more
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </LandingReveal>
          )
        })}
      </div>
    </LandingSection>
  )
}
