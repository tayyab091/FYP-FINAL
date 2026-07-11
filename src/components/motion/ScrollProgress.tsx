'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

export function ScrollProgress() {
  const reduceMotion = useReducedMotion()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (reduceMotion) return

    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [reduceMotion])

  if (reduceMotion) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-white/5">
      <div
        className="h-full bg-gradient-to-r from-primary via-sky-400 to-primary transition-[width] duration-150 ease-out shadow-[0_0_12px_rgba(34,245,154,.5)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
