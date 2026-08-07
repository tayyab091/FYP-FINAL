'use client'



import Link from 'next/link'

import { ArrowRight } from 'lucide-react'

import { PILLARS } from './constants'

import { LandingSection } from './LandingSection'

import { LandingReveal } from './LandingReveal'



const MACRO_RING_RADIUS = 14

const MACRO_RING_CIRC = 2 * Math.PI * MACRO_RING_RADIUS



function TrainMockup() {

  return (

    <div className="landing-pillar-mock landing-pillar-mock--train">

      <div className="landing-pillar-mock__header">

        <span className="landing-pillar-mock__label">Today&apos;s workout</span>

        <span className="landing-pillar-mock__badge">Push Day</span>

      </div>

      <div className="landing-pillar-mock__exercises">

        {[

          { name: 'Bench Press', sets: '4×8', done: true },

          { name: 'Incline DB', sets: '3×10', done: true },

          { name: 'Cable Fly', sets: '3×12', done: false },

        ].map((ex) => (

          <div key={ex.name} className={`landing-pillar-mock__row ${ex.done ? 'is-done' : ''}`}>

            <span className="landing-pillar-mock__check">{ex.done ? '✓' : ''}</span>

            <span className="landing-pillar-mock__name">{ex.name}</span>

            <span className="landing-pillar-mock__sets">{ex.sets}</span>

          </div>

        ))}

      </div>

      <div className="landing-pillar-mock__progress">

        <div className="landing-pillar-mock__progress-fill" style={{ width: '67%' }} />

      </div>

      <span className="landing-pillar-mock__footer">2 of 3 exercises complete</span>

    </div>

  )

}



function EatMockup() {

  const macros = [

    { label: 'Protein', pct: 78, color: 'var(--primary)' },

    { label: 'Carbs', pct: 62, color: '#38bdf8' },

    { label: 'Fats', pct: 45, color: '#a78bfa' },

  ]

  return (

    <div className="landing-pillar-mock landing-pillar-mock--eat">

      <div className="landing-pillar-mock__header">

        <span className="landing-pillar-mock__label">Daily macros</span>

        <span className="landing-pillar-mock__badge">1,840 kcal</span>

      </div>

      <div className="landing-pillar-mock__macros">

        {macros.map((m) => {

          const dash = (m.pct / 100) * MACRO_RING_CIRC

          return (

            <div key={m.label} className="landing-pillar-mock__macro">

              <div className="landing-pillar-mock__ring-wrap">

                <svg viewBox="0 0 36 36" className="landing-pillar-mock__ring" aria-hidden>

                  <circle

                    cx="18"

                    cy="18"

                    r={MACRO_RING_RADIUS}

                    fill="none"

                    stroke="currentColor"

                    strokeWidth="3"

                    opacity="0.15"

                  />

                  <circle

                    cx="18"

                    cy="18"

                    r={MACRO_RING_RADIUS}

                    fill="none"

                    stroke={m.color}

                    strokeWidth="3"

                    strokeDasharray={`${dash} ${MACRO_RING_CIRC}`}

                    strokeLinecap="round"

                    transform="rotate(-90 18 18)"

                  />

                </svg>

                <span className="landing-pillar-mock__macro-pct">{m.pct}%</span>

              </div>

              <span className="landing-pillar-mock__macro-label">{m.label}</span>

            </div>

          )

        })}

      </div>

    </div>

  )

}



function SleepMockup() {

  const bars = [6, 8, 7, 9, 7, 8, 8]

  return (

    <div className="landing-pillar-mock landing-pillar-mock--sleep">

      <div className="landing-pillar-mock__header">

        <span className="landing-pillar-mock__label">Sleep quality</span>

        <span className="landing-pillar-mock__badge">7.8 hrs avg</span>

      </div>

      <div className="landing-pillar-mock__chart" aria-hidden>

        {bars.map((h, i) => (

          <div

            key={i}

            className="landing-pillar-mock__bar-col"

            style={{ '--bar-h': `${h * 10}%` } as React.CSSProperties}

          >

            <span className="landing-pillar-mock__bar-fill" />

          </div>

        ))}

      </div>

      <div className="landing-pillar-mock__sleep-meta">

        <span>Mon</span>

        <span>Tue</span>

        <span>Wed</span>

        <span>Thu</span>

        <span>Fri</span>

        <span>Sat</span>

        <span>Sun</span>

      </div>

      <div className="landing-pillar-mock__score">

        <span className="landing-pillar-mock__score-val">92</span>

        <span className="landing-pillar-mock__score-label">Recovery score</span>

      </div>

    </div>

  )

}



function ThriveMockup() {

  return (

    <div className="landing-pillar-mock landing-pillar-mock--thrive">

      <div className="landing-pillar-mock__header">

        <span className="landing-pillar-mock__label">Your growth</span>

        <span className="landing-pillar-mock__badge landing-pillar-mock__badge--hot">🔥 12 day streak</span>

      </div>

      <svg viewBox="0 0 200 80" className="landing-pillar-mock__line-chart" aria-hidden>

        <defs>

          <linearGradient id="thriveGrad" x1="0" y1="0" x2="0" y2="1">

            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />

            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />

          </linearGradient>

        </defs>

        <path

          d="M0,65 L30,58 L60,50 L90,42 L120,35 L150,28 L180,18 L200,12"

          fill="none"

          stroke="var(--primary)"

          strokeWidth="2.5"

          strokeLinecap="round"

        />

        <path

          d="M0,65 L30,58 L60,50 L90,42 L120,35 L150,28 L180,18 L200,12 L200,80 L0,80 Z"

          fill="url(#thriveGrad)"

        />

      </svg>

      <div className="landing-pillar-mock__coach-row">

        <div className="landing-pillar-mock__avatars">

          {['AK', 'SR', 'MH'].map((init) => (

            <span key={init} className="landing-pillar-mock__avatar">

              {init}

            </span>

          ))}

        </div>

        <span className="landing-pillar-mock__coach-text">3 coaches · 2 live sessions this week</span>

      </div>

    </div>

  )

}



const PILLAR_MOCKUPS = {

  Train: TrainMockup,

  Eat: EatMockup,

  Sleep: SleepMockup,

  Thrive: ThriveMockup,

} as const



export function LandingPillars() {

  return (

    <LandingSection id="pillars" ariaLabel="T.E.S.T. pillars" className="landing-section--pillars">

      <LandingReveal className="landing-pillars__header">

        <p className="eyebrow mb-4 text-center">The T.E.S.T. method</p>

        <h2 className="display-title text-center text-3xl md:text-4xl lg:text-5xl">

          Four pillars. <span className="gradient-text">One system.</span>

        </h2>

      </LandingReveal>



      <div className="landing-pillars">

        {PILLARS.map((pillar, i) => {

          const Icon = pillar.icon

          const Mockup = PILLAR_MOCKUPS[pillar.key]

          const reversed = i % 2 === 1

          return (

            <LandingReveal
              key={pillar.key}
              direction={reversed ? 'right' : 'left'}
              delay={0.05}
              className={`landing-pillar ${reversed ? 'landing-pillar--reversed' : ''}`}
            >

              <div className="landing-pillar__visual">

                <div className="landing-pillar__visual-top">

                  <span className="eyebrow">{pillar.key}</span>

                  <div className="landing-pillar__icon-wrap">

                    <Icon className="size-7" strokeWidth={1.8} />

                  </div>

                </div>

                <Mockup />

              </div>

              <div className="landing-pillar__content">

                <h3 className="landing-pillar__title display-title">{pillar.title}</h3>

                <p className="landing-pillar__desc">{pillar.desc}</p>

                <Link href={pillar.href} className="landing-pillar__link group">

                  {pillar.cta}

                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />

                </Link>

              </div>

            </LandingReveal>

          )

        })}

      </div>

    </LandingSection>

  )

}


