'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowUpRight, ScanLine } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getRoleHomePath } from '@/lib/access'

export function FormCheckNavigation() {
  const { user } = useAuth()
  return <nav aria-label="Form checker navigation" className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
    <Link href="/?marketing=1" className="inline-flex items-center gap-2 font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={16} />Back to home</Link>
    {user && <Link href={getRoleHomePath(user.role)} className="inline-flex items-center gap-2 font-semibold text-primary">My workspace<ArrowUpRight size={16} /></Link>}
  </nav>
}

export function FormCheckPreview() {
  const reduced = useReducedMotion()
  const [movement, setMovement] = useState<'squat' | 'reach'>('squat')
  const squat = movement === 'squat'
  const joints = squat ? [[110,65],[93,116],[127,151],[70,155],[109,199],[79,199],[145,95],[72,87]] : [[110,65],[106,116],[126,159],[88,159],[140,199],[74,199],[144,55],[77,55]]
  return <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-card" aria-label="Animated form-check preview">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3"><span className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary"><ScanLine size={16} />MOVEMENT PREVIEW</span><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Demo · camera is off</span></div>
    <div className="grid items-center gap-4 p-5 sm:grid-cols-2">
      <div className="relative overflow-hidden rounded-xl border border-border bg-[#0b1510] text-[#c4dacb]">
        <svg viewBox="0 0 220 225" className="mx-auto h-52 w-full" role="img" aria-label={'Animated ' + movement + ' joint-tracking illustration'}>
          <path d="M20 205H200M55 20V205M110 20V205M165 20V205" stroke="currentColor" opacity=".1" />
          <motion.g animate={reduced ? undefined : { y: [0, 5, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}>
            <circle cx="115" cy="46" r="15" stroke="currentColor" fill="none" strokeWidth="2.5" />
            <motion.path initial={false} animate={{ d: squat ? 'M110 65L93 116L127 151L109 199M93 116L70 155L79 199M107 77L145 95L174 79M107 77L72 87L51 73' : 'M110 65L106 116L126 159L140 199M106 116L88 159L74 199M107 77L144 55L164 22M107 77L77 55L57 22' }} transition={{ duration: reduced ? 0 : .6 }} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            {joints.map(([cx,cy],i) => <motion.circle initial={false} key={i} animate={{ cx, cy }} transition={{ duration: reduced ? 0 : .6 }} r="3.5" fill="#0b1510" stroke="#22f59a" strokeWidth="2" />)}
          </motion.g>
          <path d="M133 151H192" stroke="#22f59a" strokeDasharray="3 4" /><text x="150" y="142" fill="#22f59a" fontFamily="monospace" fontSize="7">JOINT TRACKING</text>
        </svg>
      </div>
      <div><p className="eyebrow">See how it works</p><h2 className="mt-2 text-xl font-extrabold text-foreground">Move. Track. Improve.</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">The checker follows key body joints to help you review your movement. This illustration is a preview, not a live assessment.</p>
        <div className="mt-4 flex gap-2" aria-label="Preview movement">{(['squat','reach'] as const).map(option => <button type="button" key={option} aria-label={'Preview ' + option + ' movement'} aria-pressed={movement === option} onClick={() => setMovement(option)} className={'rounded-lg border px-4 py-2 text-xs font-bold capitalize transition-colors ' + (movement === option ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-primary')}>{option}</button>)}</div>
        <p className="mt-4 text-xs text-muted-foreground">Sign in with an eligible account and start the camera below when you are ready.</p>
      </div>
    </div>
  </section>
}
