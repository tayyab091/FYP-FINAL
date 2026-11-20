'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { LandingReveal } from './LandingReveal'

const worlds = [
  { number: '01', title: 'TRAIN WITH INTENT.', text: 'Find your movement. Build your strength.', image: 'gym-floor.jpg', alt: 'Free weights and strength equipment ready for a workout', href: '/exercises', action: 'Explore exercises', category: 'STRENGTH & MOVEMENT' },
  { number: '02', title: 'FUEL YOUR AMBITION.', text: 'Good food. Better energy. A plan that fits.', image: 'nutrition.jpg', alt: 'A colorful bowl of fresh vegetables and nutritious food', href: '/nutrition', action: 'Explore nutrition', category: 'FOOD & NUTRITION' },
  { number: '03', title: 'FIND YOUR PEOPLE.', text: 'The right space. The support to show up.', image: 'male-training.jpg', alt: 'A male athlete preparing a deadlift in a shared gym', href: '/gyms', action: 'Find a gym', category: 'GYMS & COMMUNITY' },
]

export function LandingTrainingWorlds() {
  return (
    <section id="explore-fitness" className="fitness-worlds" aria-label="Explore your fitness journey">
      <div className="landing-container">
        <LandingReveal className="fitness-worlds__heading"><div><h2>NOT JUST A WORKOUT.<br /><span>A WAY FORWARD.</span></h2></div></LandingReveal>
        <div className="fitness-worlds__grid">
          {worlds.map((world, i) => <LandingReveal key={world.number} delay={i * .09} className="fitness-worlds__reveal"><Link href={world.href} className="fitness-world"><div className="fitness-world__image"><Image src={'/images/home/' + world.image} alt={world.alt} fill unoptimized sizes="(min-width: 900px) 33vw, 100vw" /><span className="fitness-world__number">{world.number}</span><span className="fitness-world__arrow"><ArrowUpRight size={22} /></span></div><div className="fitness-world__copy"><span>{world.category}</span><h3>{world.title}</h3><strong>{world.action} <ArrowUpRight size={16} /></strong></div></Link></LandingReveal>)}
        </div>
      </div>
    </section>
  )
}
