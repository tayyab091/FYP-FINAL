'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { easeTransition } from '@/lib/motion'

interface LandingRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'left' | 'right'
  as?: 'div' | 'section' | 'article' | 'li'
}

const directionVariants = {
  up: {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  },
  left: {
    hidden: { opacity: 0, x: -28 },
    visible: { opacity: 1, x: 0 },
  },
  right: {
    hidden: { opacity: 0, x: 28 },
    visible: { opacity: 1, x: 0 },
  },
}

export function LandingReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
}: LandingRevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <div className={cn('landing-reveal landing-reveal--visible', className)}>{children}</div>
    )
  }

  const variants = directionVariants[direction]

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -8% 0px' }}
      variants={variants}
      transition={{ ...easeTransition, delay, duration: 0.5 }}
      className={cn('landing-reveal', className)}
    >
      {children}
    </motion.div>
  )
}
