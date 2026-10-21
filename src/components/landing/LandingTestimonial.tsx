'use client'

import { LandingSection } from './LandingSection'
import { LandingReveal } from './LandingReveal'

export function LandingTestimonial() {
  return (
    <LandingSection alt id="testimonial" ariaLabel="Member testimonial" tight>
      <LandingReveal className="landing-testimonial">
        <blockquote className="landing-testimonial__quote display-title text-balance">
          &ldquo;T.E.S.T. gives you no excuse to skip a workout.{' '}
          <span className="gradient-text">It&apos;s that easy.</span>&rdquo;
        </blockquote>
        <footer className="landing-testimonial__footer">
          <cite className="landing-testimonial__author not-italic">Ahmed K.</cite>
          <span className="landing-testimonial__role">Member, Lahore</span>
        </footer>
      </LandingReveal>
    </LandingSection>
  )
}
