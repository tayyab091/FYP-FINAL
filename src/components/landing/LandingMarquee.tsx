'use client'

import { useReducedMotion } from 'framer-motion'
import { MARQUEE_ITEMS } from './constants'

export function LandingMarquee() {
  const reduceMotion = useReducedMotion() ?? false
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

  return (
    <div className="landing-marquee" aria-label="T.E.S.T. pillars">
      <div className="landing-marquee__fade landing-marquee__fade--left" aria-hidden />
      <div className="landing-marquee__fade landing-marquee__fade--right" aria-hidden />
      <div
        className={`landing-marquee__track ${reduceMotion ? '' : 'landing-marquee__track--animate'}`}
      >
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="landing-marquee__item">
            <span className="landing-marquee__dot" aria-hidden />
            <span className="landing-marquee__text">{item}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
