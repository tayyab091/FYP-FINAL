'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Check, Crosshair, Moon, Plus, Utensils, Dumbbell } from 'lucide-react'
import { LandingReveal } from './LandingReveal'

const days = [
  { label: 'Train', icon: Dumbbell, time: '06:30', title: 'Show up for yourself.', detail: 'A little structure. A lot more intention.', items: ['Warm up · 5 minutes', 'Full-body strength · 30 minutes', 'Cool down · 5 minutes'], metric: '40', unit: 'MINUTES OF MOVEMENT', note: 'Consistency beats a perfect session.' },
  { label: 'Eat', icon: Utensils, time: '12:30', title: 'Fuel the work you put in.', detail: 'Familiar foods. A balanced plate.', items: ['Protein · chicken, eggs or daal', 'Energy · rice or whole-wheat roti', 'Balance · vegetables and water'], metric: '03', unit: 'PARTS OF A BALANCED PLATE', note: 'A plan should fit your life, not fight it.' },
  { label: 'Recover', icon: Moon, time: '22:00', title: 'Rest is part of the plan.', detail: 'Make room for tomorrow’s energy.', items: ['Wind down · put screens away', 'Recover · a gentle mobility routine', 'Recharge · a consistent sleep schedule'], metric: '08', unit: 'HOURS TO AIM FOR', note: 'Progress happens between sessions, too.' },
]

export function LandingMethod() {
  const [selected, setSelected] = useState(0)
  const day = days[selected]
  return (
    <section className="home-method home-chapter" id="method" aria-label="Explore the T.E.S.T. method">
      <div className="landing-container">
        <div className="home-chapter-label"><span>01 / THE METHOD</span><span>BUILT AROUND REAL LIFE</span></div>
        <div className="home-method__grid">
          <LandingReveal><p className="eyebrow">SMALL ACTIONS. STRONGER DAYS.</p><h2 className="home-headline">THE OTHER<br /><span>23 HOURS</span><br />MATTER TOO.</h2><p className="home-body">A workout is one part of the story. T.E.S.T. connects how you move, eat, and recover, so every part of your day works toward the same goal.</p><Link href="/signup" className="home-text-link">Build your routine <ArrowUpRight size={18} /></Link></LandingReveal>
          <LandingReveal delay={.1} className="home-day">
            <div className="home-day__top"><span>THE DAILY BLUEPRINT</span><span className="home-demo">INTERACTIVE SAMPLE</span></div>
            <div className="home-day__tabs" role="tablist" aria-label="Sample daily routine">{days.map((item, i) => { const Icon = item.icon; return <button key={item.label} id={'day-tab-' + i} role="tab" aria-selected={selected === i} aria-controls="day-panel" onClick={() => setSelected(i)} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = (selected + (e.key === 'ArrowRight' ? 1 : 2)) % 3; setSelected(next); document.getElementById('day-tab-' + next)?.focus() } }}><Icon size={16} />{item.label}</button> })}</div>
            <div id="day-panel" role="tabpanel" aria-labelledby={'day-tab-' + selected} className="home-day__panel" key={day.label}>
              <div className="home-day__clock"><span>{day.time}</span><span>YOUR TIME. WELL SPENT.</span></div><h3>{day.title}</h3><p>{day.detail}</p>
              <ul>{day.items.map(item => <li key={item}><Check size={15} /><span>{item}</span></li>)}</ul>
              <div className="home-day__metric"><strong>{day.metric}</strong><span>{day.unit}</span><svg viewBox="0 0 90 35" aria-hidden><path d="M2 28L16 22L29 26L43 12L56 16L70 6L88 2" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div>
              <p className="home-day__note">↳ {day.note}</p>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  )
}

export function LandingFormStudio() {
  const reduced = useReducedMotion()
  const [movement, setMovement] = useState<'squat' | 'reach'>('squat')
  return (
    <section className="home-studio home-chapter" aria-label="AI form feedback">
      <div className="landing-container">
        <div className="home-chapter-label"><span>02 / MOVE WITH INTENTION</span><span>YOUR NEXT REP, REFINED</span></div>
        <div className="home-studio__grid">
          <LandingReveal className="home-scanner">
            <div className="home-scanner__top"><Crosshair size={17} /><span>MOVEMENT LAB</span><span>DEMO VIEW</span></div>
            <div className="home-scanner__canvas">
              <span className="home-scanner__corner home-scanner__corner--tl" /><span className="home-scanner__corner home-scanner__corner--br" />
              <svg viewBox="0 0 340 320" role="img" aria-label="Illustration of exercise joint tracking">
                <path d="M30 285H310M85 30V285M170 30V285M255 30V285" stroke="currentColor" opacity=".08" fill="none" />
                <motion.g animate={reduced ? undefined : { y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                  <circle cx="190" cy="65" r="22" fill="none" stroke="currentColor" strokeWidth="3" />
                  <motion.path animate={{ d: movement === 'squat' ? 'M183 89L160 157L210 203L180 272M160 157L107 204L125 273M178 105L233 134L265 112M178 105L125 118L91 101' : 'M183 89L173 160L207 213L221 272M173 160L147 213L125 273M178 105L225 78L248 30M178 105L130 78L107 30' }} transition={{ duration: reduced ? 0 : .65 }} stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  {(movement === 'squat' ? [[183,89],[160,157],[210,203],[107,204],[180,272],[125,273],[233,134],[125,118]] : [[183,89],[173,160],[207,213],[147,213],[221,272],[125,273],[225,78],[130,78]]).map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="5" fill="#0b1510" stroke="#22f59a" strokeWidth="2" />)}
                </motion.g>
                <path d="M217 204H283" stroke="#22f59a" strokeDasharray="3 4" /><text x="245" y="193" fill="#22f59a" fontSize="9" fontFamily="monospace">ALIGNMENT</text>
              </svg>
              <div className="home-scanner__sweep" aria-hidden />
            </div>
            <div className="home-scanner__controls" aria-label="Illustrated movement"><span>EXPLORE THE MOTION</span><button type="button" aria-pressed={movement === 'squat'} onClick={() => setMovement('squat')}>Squat</button><button type="button" aria-pressed={movement === 'reach'} onClick={() => setMovement('reach')}>Reach</button></div>
            <div className="home-scanner__bottom"><span><i /> FORM OVER EGO</span><span>ILLUSTRATIVE PREVIEW</span></div>
          </LandingReveal>
          <LandingReveal direction="right"><p className="eyebrow">A BETTER REP STARTS HERE</p><h2 className="home-headline">DON’T JUST<br />COUNT REPS.<br /><span>MAKE THEM COUNT.</span></h2><p className="home-body">Explore camera-based form checks alongside exercise demonstrations. Get a clearer picture of your movement and bring better questions to your coach.</p><Link href="/exercise-check" className="fitness-button">Explore the form checker <ArrowUpRight size={20} /></Link><p className="home-fineprint">Guidance for your training. Not a substitute for a qualified coach or medical advice.</p></LandingReveal>
        </div>
      </div>
    </section>
  )
}

export function LandingRecovery() {
  return (
    <section className="home-recovery" aria-label="Sustainable fitness">
      <div className="home-recovery__photo"><Image src="/images/home/male-strength.jpg" alt="A male athlete training with an EZ curl bar" fill unoptimized sizes="(min-width: 900px) 55vw, 100vw" /></div>
      <div className="home-recovery__copy"><LandingReveal><span className="home-recovery__stamp">T.E.S.T. FIELD NOTES / 003</span><h2>STRONG FOR<br />THE GYM.<br /><em>READY FOR LIFE.</em></h2><p>For the stairs that feel easier. The weekend you say yes to. The confidence that follows you home.</p><p>Fitness should give you more life, not take over your life.</p><Link href="/coaching" className="home-text-link">Find support that fits <ArrowUpRight size={18} /></Link><div className="home-recovery__signature">Train. Eat. Sleep. Thrive.<span>THE EVERYDAY ATHLETE’S MANIFESTO</span></div></LandingReveal></div>
    </section>
  )
}

const questions = [
  ['Do I need to be experienced to start?', 'No. Start with your current fitness level, explore exercise demonstrations, and connect with a trainer for a routine that fits your experience and goals.'],
  ['Can I use T.E.S.T. without joining a gym?', 'Yes. Exercise resources, nutrition tools, and progress tracking can support your routine at home or at a gym. Choose movements suited to your equipment and ability.'],
  ['How do I find the right trainer?', 'Explore trainer profiles, specialties, affiliated gyms, and reviews. Your connected trainer can guide your training and discuss a suitable plan with you.'],
  ['What can I try before upgrading?', 'Start with the Basic plan and explore the platform. Compare the current features and prices on the subscription page before choosing a paid plan.'],
]

export function LandingStartAndFaq() {
  return (
    <>
      <section className="home-start home-chapter" aria-label="Getting started"><div className="landing-container"><div className="home-chapter-label"><span>04 / YOUR FIRST MOVE</span><span>NO PERFECT START REQUIRED</span></div><LandingReveal><h2 className="home-headline">FROM “ONE DAY”<br /><span>TO DAY ONE.</span></h2></LandingReveal><div className="home-start__steps">{[
        ['01', 'MAKE IT PERSONAL.', 'Set your goals, experience, and preferences.', '/signup', 'Create your profile'],
        ['02', 'FIND YOUR RHYTHM.', 'Explore exercises and build a routine you can repeat.', '/exercises', 'Explore movement'],
        ['03', 'KEEP SHOWING UP.', 'Connect with a coach and track the work you put in.', '/coaching', 'Meet your coach'],
      ].map(([n,title,text,href,cta],i) => <LandingReveal key={n} delay={i * .08}><article><span>{n}</span><h3>{title}</h3><p>{text}</p><Link href={href}>{cta}<ArrowUpRight size={17} /></Link></article></LandingReveal>)}</div></div></section>
      <section className="home-faq" aria-label="Frequently asked questions"><div className="landing-container home-faq__grid"><div><p className="eyebrow">BEFORE YOU BEGIN</p><h2 className="home-headline">GOOD<br /><span>QUESTIONS.</span></h2><p className="home-body">A little clarity goes a long way.</p></div><div>{questions.map(([q,a]) => <details key={q}><summary>{q}<Plus size={18} aria-hidden /></summary><p>{a}</p></details>)}</div></div></section>
      <section className="home-finale" aria-label="Start your fitness journey"><div className="landing-container"><span>YOUR NEXT CHAPTER DOESN’T WRITE ITSELF.</span><Link href="/signup" className="home-finale__link">LET’S<br /><em>GET TO IT.</em><ArrowUpRight aria-hidden /></Link><div className="home-finale__bottom"><span>TRAIN / EAT / SLEEP / THRIVE</span><Link href="/subscription">Find your plan <ArrowUpRight size={16} /></Link></div></div></section>
    </>
  )
}
