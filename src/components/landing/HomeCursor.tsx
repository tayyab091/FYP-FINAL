'use client'

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'

/** Decorative follower only; the native cursor still marks the exact click target. */
export function HomeCursor() {
  const reduced = useReducedMotion()
  const node = useRef<HTMLDivElement>(null)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const scale = useMotionValue(1)
  const followX = useSpring(x, { stiffness: 450, damping: 38, mass: .5 })
  const followY = useSpring(y, { stiffness: 450, damping: 38, mass: .5 })
  const followScale = useSpring(scale, { stiffness: 350, damping: 25 })

  useEffect(() => {
    if (reduced) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const hide = () => { if (node.current) node.current.style.opacity = '0' }
    const move = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType !== 'mouse') { hide(); return }
      x.set(event.clientX - 17)
      y.set(event.clientY - 17)
      scale.set(event.target instanceof Element && event.target.closest('a, button, summary, input, textarea') ? 1.5 : 1)
      if (node.current) node.current.style.opacity = '.7'
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', hide)
    window.addEventListener('blur', hide)
    fine.addEventListener('change', hide)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', hide)
      window.removeEventListener('blur', hide)
      fine.removeEventListener('change', hide)
    }
  }, [reduced, x, y, scale])

  if (reduced) return null
  return <motion.div ref={node} aria-hidden className="home-cursor" style={{ x: followX, y: followY, scale: followScale }}><span /><span /><span /><span /></motion.div>
}
