'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useReducedMotion } from 'framer-motion'
import { ArrowRight, Star, Zap } from 'lucide-react'

const HOLD_DURATION_MS = 1500
const headlineWords = ['Built', 'to', 'perform.']

type Particle = { id: number; x: number; y: number; angle: number; dist: number; size: number }

export function LandingHero() {
  const reduceMotion = useReducedMotion() ?? false
  const heroRef = useRef<HTMLElement>(null)
  const rafRef = useRef<number | null>(null)
  const holdStartRef = useRef<number | null>(null)
  const holdingRef = useRef(false)
  const completedRef = useRef(false)

  const [energy, setEnergy] = useState(0)
  const [holding, setHolding] = useState(false)
  const [blast, setBlast] = useState(false)
  const [energized, setEnergized] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [mounted, setMounted] = useState(reduceMotion)

  useEffect(() => {
    if (reduceMotion) return
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [reduceMotion])

  const spawnBurst = useCallback(() => {
    const count = 12
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: 0,
      y: 0,
      angle: (360 / count) * i + Math.random() * 18,
      dist: 50 + Math.random() * 70,
      size: 4 + Math.random() * 4,
    }))
    setParticles(newParticles)
    setBlast(true)
    setEnergized(true)

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([30, 20, 50])
    }

    setTimeout(() => setBlast(false), 900)
    setTimeout(() => setEnergized(false), 2800)
    setTimeout(() => setParticles([]), 1000)
  }, [])

  const tickHold = useCallback(
    (timestamp: number) => {
      if (!holdStartRef.current || !holdingRef.current) return
      const elapsed = timestamp - holdStartRef.current
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100)
      setEnergy(pct)

      if (pct >= 100 && !completedRef.current) {
        completedRef.current = true
        spawnBurst()
      }

      if (holdingRef.current) {
        rafRef.current = requestAnimationFrame(tickHold)
      }
    },
    [spawnBurst]
  )

  const startHold = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      completedRef.current = false
      holdingRef.current = true
      holdStartRef.current = performance.now()
      setHolding(true)
      setEnergy(0)
      setBlast(false)
      rafRef.current = requestAnimationFrame(tickHold)
    },
    [tickHold]
  )

  const endHold = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    holdingRef.current = false
    setHolding(false)
    holdStartRef.current = null
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (!completedRef.current) setEnergy(0)
    completedRef.current = false
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const ringCircumference = 2 * Math.PI * 36
  const ringOffset = ringCircumference - (energy / 100) * ringCircumference

  const holdLabel = energized
    ? 'Blast!'
    : holding
      ? energy >= 85
        ? 'Almost there…'
        : 'Keep holding…'
      : 'Hold to energize'

  return (
    <section
      ref={heroRef}
      className={[
        'landing-hero',
        mounted ? 'landing-hero--mounted' : '',
        holding ? 'landing-hero--holding' : '',
        energized ? 'landing-hero--energized' : '',
        blast ? 'landing-hero--blast' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Hero"
    >
      <div className="landing-hero__grid" aria-hidden>
        <svg className="landing-hero__grid-svg" preserveAspectRatio="none">
          <defs>
            <pattern id="heroGrid" width="88" height="88" patternUnits="userSpaceOnUse">
              <path d="M 88 0 L 0 0 0 88" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#heroGrid)" />
        </svg>
      </div>

      <div className="landing-hero__mesh" aria-hidden />

      {blast && !reduceMotion && (
        <>
          <span className="landing-hero__screen-flash" aria-hidden />
          <span className="landing-hero__energy-wave" aria-hidden />
        </>
      )}

      {!reduceMotion && (
        <>
          <div className="landing-hero__orb landing-hero__orb--1" aria-hidden />
          <div className="landing-hero__orb landing-hero__orb--2" aria-hidden />
          <div className="landing-hero__orb landing-hero__orb--3" aria-hidden />
        </>
      )}

      <div className="landing-container landing-hero__inner">
        <div className="landing-hero__content">
          <p className="eyebrow landing-hero__eyebrow landing-hero__anim">Train · Eat · Sleep · Thrive</p>

          <h1 className="landing-hero__title" aria-label="Built to perform">
            {headlineWords.map((word, i) => (
              <span
                key={word + i}
                className={[
                  'landing-hero__title-word',
                  'landing-hero__anim',
                  i === headlineWords.length - 1 ? 'landing-hero__title-accent' : '',
                  holding ? 'landing-hero__title-word--holding' : '',
                  energized || blast ? 'landing-hero__title-word--energized' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ animationDelay: `${0.08 + i * 0.1}s` }}
              >
                {word}
              </span>
            ))}
          </h1>

          <p className="landing-hero__sub landing-hero__anim" style={{ animationDelay: '0.35s' }}>
            T.E.S.T. unifies training, nutrition, recovery, and coaching — one platform for
            Pakistan&apos;s fitness community.
          </p>

          <div className="landing-hero__actions landing-hero__anim" style={{ animationDelay: '0.45s' }}>
            <Link href="/signup" className="btn-accent group px-10 text-base">
              Get Started Free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/coaching" className="landing-hero__link group">
              Explore coaching
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="landing-hero__hold-wrap landing-hero__anim" style={{ animationDelay: '0.55s' }}>
            <button
              type="button"
              className={[
                'landing-hero__hold',
                holding ? 'landing-hero__hold--active' : '',
                blast ? 'landing-hero__hold--burst' : '',
                energized ? 'landing-hero__hold--energized' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onPointerCancel={endHold}
              aria-label="Hold to energize"
            >
              <span className="landing-hero__hold-ring" aria-hidden>
                {holding && !reduceMotion && <span className="landing-hero__hold-pulse" aria-hidden />}
                <svg viewBox="0 0 84 84" className="landing-hero__hold-svg">
                  <circle
                    cx="42"
                    cy="42"
                    r="36"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="landing-hero__hold-track"
                  />
                  <circle
                    cx="42"
                    cy="42"
                    r="36"
                    fill="none"
                    stroke="url(#holdGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 42 42)"
                    className="landing-hero__hold-progress"
                  />
                  <defs>
                    <linearGradient id="holdGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                </svg>
                <Zap
                  className={`landing-hero__hold-icon size-7 ${holding || energized ? 'text-primary' : 'text-muted-foreground'}`}
                />
                {blast && <span className="landing-hero__hold-flash" aria-hidden />}
              </span>
              {particles.map((p) => (
                <span
                  key={p.id}
                  className="landing-hero__particle"
                  style={
                    {
                      '--angle': `${p.angle}deg`,
                      '--dist': `${p.dist}px`,
                      '--size': `${p.size}px`,
                    } as React.CSSProperties
                  }
                  aria-hidden
                />
              ))}
              <span className="landing-hero__hold-label">{holdLabel}</span>
            </button>
          </div>
        </div>

        <div className="landing-hero__proof landing-hero__anim" style={{ animationDelay: '0.65s' }}>
          <div className="landing-hero__avatars" aria-hidden>
            {['A', 'S', 'H', 'M', 'K'].map((letter) => (
              <span key={letter} className="landing-hero__avatar">
                {letter}
              </span>
            ))}
          </div>
          <div className="landing-hero__proof-text">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="size-3.5 fill-primary text-primary" />
              ))}
            </div>
            <p>
              <strong className="text-foreground">4.9</strong>
              <span className="text-muted-foreground"> · trusted by thousands across Pakistan</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
