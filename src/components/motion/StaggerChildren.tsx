'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { easeTransition, fadeUp, staggerContainer } from '@/lib/motion'

interface StaggerChildrenProps {
  children: ReactNode
  className?: string
  itemClassName?: string
  as?: 'div' | 'ul' | 'section'
}

export function StaggerChildren({
  children,
  className,
  itemClassName,
  as = 'div',
}: StaggerChildrenProps) {
  const reduceMotion = useReducedMotion()
  const Container = motion[as]

  return (
    <Container
      initial={reduceMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-30px' }}
      variants={staggerContainer}
      className={cn(className)}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              transition={easeTransition}
              className={itemClassName}
            >
              {child}
            </motion.div>
          ))
        : children}
    </Container>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      variants={fadeUp}
      transition={easeTransition}
      initial={reduceMotion ? false : undefined}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
