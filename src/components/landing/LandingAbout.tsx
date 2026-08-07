'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LandingSection } from './LandingSection'
import { LandingReveal } from './LandingReveal'

export function LandingAbout() {
  return (
    <LandingSection alt id="about" ariaLabel="About T.E.S.T.">
      <div className="landing-editorial">
        <LandingReveal className="landing-editorial__main">
          <p className="eyebrow mb-6">Our mission</p>
          <h2 className="landing-editorial__headline display-title text-balance">
            Fitness should feel{' '}
            <span className="gradient-text">human</span>
            {' '}— not fragmented.
          </h2>
          <p className="landing-editorial__body">
            T.E.S.T. is Pakistan&apos;s connected fitness platform. We bring training,
            nutrition, recovery, and coaching into one editorial-grade experience —
            designed for clarity, built for momentum.
          </p>
          <Link href="/signup" className="landing-editorial__link group">
            Start your journey
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </LandingReveal>

        <LandingReveal direction="right" delay={0.1} className="landing-editorial__quote-wrap">
          <blockquote className="landing-editorial__quote">
            <span className="landing-editorial__quote-mark" aria-hidden>&ldquo;</span>
            <p>
              Every rep, every meal, every hour of rest —{' '}
              <em>designed to mean something.</em>
            </p>
          </blockquote>
          <div className="landing-editorial__meta">
            <span className="landing-editorial__meta-label">Est. 2024</span>
            <span className="landing-editorial__meta-divider" aria-hidden />
            <span className="landing-editorial__meta-label">Pakistan&apos;s fitness platform</span>
          </div>
        </LandingReveal>
      </div>
    </LandingSection>
  )
}
