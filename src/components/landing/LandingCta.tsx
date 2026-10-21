'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LandingReveal } from './LandingReveal'

export function LandingCta() {
  return (
    <section className="landing-cta-section" aria-label="Call to action">
      <div className="landing-container">
        <LandingReveal>
          <div className="landing-cta">
            <div className="landing-cta__mesh" aria-hidden />
            <div className="landing-cta__content">
              <p className="eyebrow mb-4">Your strongest chapter starts now</p>
              <h2 className="display-title landing-cta__title text-balance">
                Ready to{' '}
                <span className="gradient-text">Thrive?</span>
              </h2>
              <p className="landing-cta__sub">
                Join thousands achieving their fitness goals with T.E.S.T.
              </p>
              <div className="landing-cta__actions">
                <Link href="/signup" className="btn-accent group px-10 text-base">
                  Start Your Journey
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/subscription" className="btn-outline">
                  View plans
                </Link>
              </div>
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  )
}
