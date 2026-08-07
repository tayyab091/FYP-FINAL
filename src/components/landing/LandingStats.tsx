'use client'

import { STATS } from './constants'
import { CountUp } from '@/components/motion/CountUp'
import { LandingSection } from './LandingSection'
import { LandingReveal } from './LandingReveal'

export function LandingStats() {
  return (
    <LandingSection id="stats" ariaLabel="Platform statistics" className="landing-section--stats">
      <div className="landing-stats__band" aria-hidden />

      <LandingReveal className="landing-stats__header">
        <p className="eyebrow mb-4 text-center">By the numbers</p>
        <h2 className="display-title text-center text-foreground text-3xl md:text-4xl lg:text-5xl">
          Platform at a glance
        </h2>
      </LandingReveal>

      <div className="landing-stats__grid">
        {STATS.map((stat, i) => {
          const Icon = stat.icon
          return (
            <LandingReveal key={stat.label} delay={i * 0.06} className="landing-stat">
              <span className="landing-stat__icon" aria-hidden>
                <Icon className="size-6" strokeWidth={1.8} />
              </span>
              <div className="landing-stat__value text-foreground">
                <CountUp value={stat.value} suffix={stat.suffix} spring />
              </div>
              <p className="landing-stat__label text-muted-foreground">{stat.label}</p>
            </LandingReveal>
          )
        })}
      </div>
    </LandingSection>
  )
}
