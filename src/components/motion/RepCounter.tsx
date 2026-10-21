'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface RepCounterProps {
  count: number
  label?: string
  className?: string
  children?: ReactNode
}

export function RepCounter({ count, label = 'REPS', className, children }: RepCounterProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div className={cn('text-center', className)}>
      <motion.div
        key={count}
        initial={reduceMotion ? false : { scale: 1.35, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        className="font-heading text-3xl font-black text-foreground md:text-4xl"
      >
        {children ?? count}
      </motion.div>
      <p className="workout-label mt-0.5">{label}</p>
    </div>
  )
}
