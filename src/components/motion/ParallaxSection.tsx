'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { easeTransition } from '@/lib/motion'

interface ParallaxSectionProps {
  children: ReactNode
  className?: string
  offset?: number
}

export function ParallaxSection({ children, className, offset = 40 }: ParallaxSectionProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <section className={className}>{children}</section>
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: offset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={easeTransition}
      className={cn(className)}
    >
      {children}
    </motion.section>
  )
}
