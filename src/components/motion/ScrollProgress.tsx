'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

export function ScrollProgress() {
  const reduceMotion = useReducedMotion()
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduceMotion) return

    let frame = 0
    const updateProgress = () => {
      frame = 0
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? Math.max(0, Math.min(1, scrollTop / docHeight)) : 0
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateProgress)
    }
    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reduceMotion])

  if (reduceMotion) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-white/5">
      <div
        ref={progressRef}
        className="h-full origin-left bg-gradient-to-r from-primary via-sky-400 to-primary shadow-[0_0_12px_rgba(34,245,154,.5)]"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  )
}
