'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { easeTransition, fadeUp } from '@/lib/motion'

interface PageShellProps {
  children: ReactNode
  className?: string
  variant?: 'public' | 'dashboard'
  width?: 'default' | 'narrow' | 'wide'
}

const widths = {
  default: 'max-w-6xl',
  narrow: 'max-w-2xl',
  wide: 'max-w-7xl',
}

export function PageShell({
  children,
  className,
  variant = 'public',
  width = 'default',
}: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6',
        variant === 'public' ? 'min-h-screen pb-28 pt-24' : 'pb-12 pt-8',
        widths[width],
        className,
      )}
    >
      {children}
    </div>
  )
}

interface PageHeroProps {
  eyebrow?: string
  title: string
  description?: string
  children?: ReactNode
  className?: string
  tagline?: string
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  className,
  tagline,
}: PageHeroProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      variants={fadeUp}
      transition={easeTransition}
      className={cn('page-hero relative mb-8 overflow-hidden px-6 py-10 sm:px-8 sm:py-12', className)}
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl animate-energy-pulse" />
      {eyebrow && <p className="eyebrow relative mb-3">{eyebrow}</p>}
      <h1 className="display-title relative text-balance text-3xl sm:text-4xl md:text-5xl">{title}</h1>
      {description && (
        <p className="relative mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
      {tagline && (
        <p className="workout-label relative mt-3 text-primary/70">{tagline}</p>
      )}
      {children && <div className="relative mt-6">{children}</div>}
    </motion.section>
  )
}
