'use client'

import { useEffect, useState } from 'react'

const MAX_VISIBLE_MS = 1500
const FADE_MS = 400

export function LandingLoader() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'hidden'>('visible')

  useEffect(() => {
    let cancelled = false
    let hideTimer: ReturnType<typeof setTimeout> | null = null
    let fadeTimer: ReturnType<typeof setTimeout> | null = null

    const beginFade = () => {
      if (cancelled) return
      setPhase('fading')
      fadeTimer = setTimeout(() => {
        if (!cancelled) setPhase('hidden')
      }, FADE_MS)
    }

    const onReady = () => beginFade()

    if (document.readyState === 'complete') {
      hideTimer = setTimeout(onReady, 120)
    } else {
      window.addEventListener('load', onReady, { once: true })
      hideTimer = setTimeout(onReady, MAX_VISIBLE_MS)
    }

    return () => {
      cancelled = true
      window.removeEventListener('load', onReady)
      if (hideTimer) clearTimeout(hideTimer)
      if (fadeTimer) clearTimeout(fadeTimer)
    }
  }, [])

  if (phase === 'hidden') return null

  return (
    <div
      className={`landing-loader${phase === 'fading' ? ' landing-loader--fading' : ''}`}
      aria-hidden={phase === 'fading'}
      role="presentation"
    >
      <div className="landing-loader__inner">
        <div className="landing-loader__logo" aria-hidden>
          T.E.S.T.
        </div>
        <div className="landing-loader__bar" aria-hidden>
          <span className="landing-loader__bar-fill" />
        </div>
        <div className="landing-loader__spinner size-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-label="Loading" />
      </div>
    </div>
  )
}
