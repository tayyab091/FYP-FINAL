'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CountUpProps {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
  decimals?: number
  spring?: boolean
}

function springEase(t: number): number {
  const c4 = (2 * Math.PI) / 3
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

export function CountUp({
  value,
  suffix = '',
  prefix = '',
  duration = 1.2,
  className,
  decimals = 0,
  spring = false,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(reduceMotion ? value : 0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!inView) return
    if (reduceMotion) {
      setDisplay(value)
      setRevealed(true)
      return
    }

    setRevealed(true)
    let start: number | null = null
    let frame: number

    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / (duration * 1000), 1)
      const eased = spring ? springEase(progress) : 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration, reduceMotion, spring])

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()

  return (
    <span
      ref={ref}
      className={cn('tabular-nums landing-count-up', revealed && 'landing-count-up--visible', className)}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
