'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MARKETING_PLANS } from '@/lib/plans'
import { LandingSection } from './LandingSection'
import { LandingReveal } from './LandingReveal'

export function LandingPricing() {
  const eliteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = eliteRef.current
    if (!el) return
    const name = el.querySelector('.landing-pricing__name')
    const nameStyles = name ? getComputedStyle(name) : null
    // #region agent log
    fetch('http://127.0.0.1:7893/ingest/3b5841b0-46ed-4652-9b9f-279e38a5ba27',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1483ff'},body:JSON.stringify({sessionId:'1483ff',location:'LandingPricing.tsx:mount',message:'elite card theme styles',data:{cardBg:getComputedStyle(el).backgroundColor,nameColor:nameStyles?.color,themeClass:document.documentElement.className},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }, [])

  return (
    <LandingSection id="pricing" ariaLabel="Pricing plans">
      <LandingReveal className="landing-pricing__header">
        <p className="eyebrow mb-4 text-center">Flexible plans</p>
        <h2 className="display-title text-center text-3xl md:text-4xl lg:text-5xl">
          Simple pricing
        </h2>
        <p className="mt-4 text-center text-muted-foreground">
          Start free, upgrade when you&apos;re ready
        </p>
      </LandingReveal>

      <div className="landing-pricing__grid">
        {MARKETING_PLANS.map((plan, i) => (
          <LandingReveal key={plan.name} delay={i * 0.08} className="landing-pricing__cell">
            <div
              ref={plan.premium ? eliteRef : undefined}
              className={[
                'landing-pricing__card',
                plan.highlight ? 'landing-pricing__card--highlight' : '',
                plan.premium ? 'landing-pricing__card--elite' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {plan.premium && (
                <Badge className="landing-pricing__badge landing-pricing__badge--elite">
                  Premium
                </Badge>
              )}
              {plan.highlight && !plan.premium && (
                <Badge className="landing-pricing__badge bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              <h3 className="landing-pricing__name">{plan.name}</h3>
              <div className="landing-pricing__price">{plan.price}</div>
              <ul className="landing-pricing__features">
                {plan.features.map((feature) => (
                  <li key={feature} className="landing-pricing__feature">
                    <span className="landing-pricing__check" aria-hidden>
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/subscription"
                className={[
                  'landing-pricing__cta',
                  plan.premium
                    ? 'landing-pricing__cta--elite btn-accent'
                    : plan.highlight
                      ? 'btn-accent'
                      : 'btn-outline',
                ].join(' ')}
              >
                Choose {plan.name}
              </Link>
            </div>
          </LandingReveal>
        ))}
      </div>
    </LandingSection>
  )
}
