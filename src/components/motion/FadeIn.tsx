'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { easeTransition, fadeUp } from '@/lib/motion'

interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'article' | 'li'
}

export function FadeIn({ children, className, delay = 0, as = 'div' }: FadeInProps) {
  const reduceMotion = useReducedMotion()
  const Component = motion[as]

  return (
    <Component
      initial={reduceMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={fadeUp}
      transition={{ ...easeTransition, delay }}
      className={cn(className)}
    >
      {children}
    </Component>
  )
}
