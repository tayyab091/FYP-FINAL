'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUpRight, ArrowRight } from 'lucide-react'

export function LandingHero() {
  const reduced = useReducedMotion()

  return (
    <section className="fitness-hero" aria-label="Hero">
      <div className="fitness-hero__image">
        <Image src="/images/home/strength-training.jpg" alt="Athlete gripping a loaded barbell on the gym floor" fill sizes="100vw" preload />
      </div>
      <div className="fitness-hero__shade" aria-hidden />
      <div className="fitness-hero__frame">
        <div className="fitness-hero__topline"><span><i /> PAKISTAN&apos;S CONNECTED FITNESS PLATFORM</span></div>
        <div className="fitness-hero__body">
          <h1 aria-label="Built to perform" className="fitness-hero__headline">
            {['BUILT TO', 'PERFORM.'].map((word, index) => <span className="fitness-hero__line" key={word}><motion.span initial={reduced ? false : { y: '110%' }} animate={{ y: 0 }} transition={{ duration: .85, delay: .15 + index * .15, ease: [.22, 1, .36, 1] }}>{index === 0 ? <>BUILT <span className="fitness-thunder-t" aria-hidden><svg viewBox="0 0 62 90"><path d="M2 2H60V17H39L29 39H44L17 88L23 52H12L25 17H2Z" fill="currentColor" /></svg></span>O</> : word}</motion.span></span>)}
          </h1>
          <motion.div initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .55 }}>
            <p className="fitness-hero__intro">Train smarter. Fuel better. Find your coach.</p>
            <div className="fitness-hero__actions"><Link href="/signup" className="fitness-button">Get Started Free <ArrowUpRight size={20} /></Link><Link href="/coaching" className="fitness-hero__secondary">Find your coach <ArrowRight size={18} /></Link></div>
          </motion.div>
        </div>
        <div className="fitness-hero__bottom"><a href="#explore-fitness" className="fitness-scroll"><span><ArrowDown size={18} /></span> SCROLL TO EXPLORE</a><Link href="/gyms" className="fitness-hero__gym"><span>FIND YOUR SPACE<strong>Make the first rep count.</strong></span><ArrowUpRight size={24} /></Link></div>
      </div>
    </section>
  )
}
