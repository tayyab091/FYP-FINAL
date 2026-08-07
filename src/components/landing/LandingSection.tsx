'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface LandingSectionProps {
  children: ReactNode
  id?: string
  className?: string
  alt?: boolean
  tight?: boolean
  ariaLabel?: string
}

export function LandingSection({
  children,
  id,
  className,
  alt = false,
  tight = false,
  ariaLabel,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn(
        'landing-section',
        alt && 'landing-section--alt',
        tight && 'landing-section--tight',
        className
      )}
    >
      <div className="landing-container">{children}</div>
    </section>
  )
}
