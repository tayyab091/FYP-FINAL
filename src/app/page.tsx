'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { Trainer } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { FadeIn, StaggerChildren, CountUp, FitnessBadge, ScrollProgress, ParallaxSection } from '@/components/motion'
import { MARKETING_PLANS } from '@/lib/plans'
import { ACHIEVEMENT_DEFINITIONS, JOURNEY_LEVELS } from '@/lib/achievements'
import { Bot, BadgeCheck, Apple, BarChart3, MessageCircle, Building2, Search, Zap } from 'lucide-react'
import { easeTransition } from '@/lib/motion'

const STATS = [
  { value: 1500, label: 'Exercise GIFs', suffix: '+' },
  { value: 4, label: 'AI Form Modes', suffix: '' },
  { value: 3, label: 'Membership Plans', suffix: '' },
  { value: 24, label: 'AI Coach Access', suffix: '/7' },
]

const STEPS = [
  { step: '01', title: 'Sign Up', desc: 'Create your free account and set your fitness goals.' },
  { step: '02', title: 'Find a Trainer', desc: 'Browse verified trainers and send a coaching request.' },
  { step: '03', title: 'Train & Track', desc: 'Follow personalized plans, log meals, and track progress.' },
]

const ACHIEVEMENTS = ACHIEVEMENT_DEFINITIONS

const FEATURES = [
  { icon: Bot, title: 'AI Coaching', desc: 'Get instant workout and nutrition advice powered by AI.' },
  { icon: BadgeCheck, title: 'Verified Trainers', desc: 'Connect with certified professionals across Pakistan.' },
  { icon: Apple, title: 'Nutrition Tracking', desc: 'Log meals, analyze macros, and hit your calorie targets.' },
  { icon: BarChart3, title: 'Progress Analytics', desc: 'Visualize weight, body fat, and workout consistency.' },
  { icon: MessageCircle, title: 'Direct Chat', desc: 'Message your trainer in real-time for guidance.' },
  { icon: Building2, title: 'Gym Partnerships', desc: 'Find trainers at verified gyms near you.' },
]

function GuestPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    fetch('/api/trainers?limit=6', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data?.trainers
        setTrainers(Array.isArray(list) ? list : [])
      })
      .catch(() => setTrainers([]))
      .finally(() => {
        clearTimeout(timeout)
        setLoading(false)
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  return (
    <div className="min-h-screen text-white pb-24">
      <ScrollProgress />
      {/* Hero */}
      <section className="relative pt-28 pb-14 px-4 sm:px-6 overflow-hidden">
        <div className="page-hero max-w-6xl mx-auto relative px-6 py-20 text-center sm:px-10 md:py-28 gym-floor">
          <div className="absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl animate-energy-pulse" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...easeTransition, delay: 0.1 }}
          >
            <Badge className="relative mb-7 border-primary/20 bg-primary/10 text-primary">
              <Zap className="mr-1 inline size-3" /> Pakistan&apos;s #1 Fitness Platform
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...easeTransition, delay: 0.2 }}
            className="display-title text-balance relative text-5xl md:text-7xl lg:text-8xl mb-7"
          >
            Train. Eat. Sleep.<br />
            <span className="gradient-text">Thrive.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...easeTransition, delay: 0.35 }}
            className="text-balance text-muted-foreground text-base md:text-xl max-w-2xl mx-auto mb-4 leading-relaxed"
          >
            Connect with verified trainers, track nutrition with AI, and achieve your fitness goals — all in one platform.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="workout-label relative mb-10 text-primary/70"
          >
            No excuses · Just reps
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...easeTransition, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/signup" className="btn-accent px-8 py-4 text-base font-bold">Get Started Free</Link>
            <Link href="/coaching" className="px-8 py-4 rounded-full border border-white/10 bg-white/[.025] text-white hover:border-primary/40 hover:bg-primary/[.05] transition-all font-bold">
              Browse Trainers
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <ParallaxSection className="pb-10 px-6">
        <StaggerChildren className="max-w-6xl mx-auto dashboard-grid cols-4">
          {STATS.map(s => (
            <div key={s.label} className="elite-panel metric-glow card-athletic p-5 text-center interactive-lift">
              <div className="font-heading text-3xl md:text-4xl font-black text-primary mb-1">
                <CountUp value={s.value} suffix={s.suffix} />
              </div>
              <div className="workout-label text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </StaggerChildren>
      </ParallaxSection>

      {/* Journey / Level up */}
      <section className="py-16 px-6 border-y border-white/[.05] bg-white/[.012]">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-10">
            <p className="eyebrow mb-3">Your fitness RPG</p>
            <h2 className="display-title text-3xl md:text-5xl mb-3">Level Up Your Journey</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Every rep, meal, and check-in earns XP. Stay consistent and climb the ranks.</p>
          </FadeIn>
          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 hidden h-1 -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block" />
            <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {JOURNEY_LEVELS.map((lvl) => (
                <div key={lvl.level} className="elite-panel interactive-lift card-athletic flex h-full min-h-[12rem] flex-col rounded-2xl p-6 text-center relative">
                  <FitnessBadge variant="pr" className="mb-3">LVL {lvl.level}</FitnessBadge>
                  <h3 className="text-lg font-bold text-white">{lvl.title}</h3>
                  <p className="text-primary text-sm font-bold mt-1">{lvl.xp} XP</p>
                  <p className="text-muted-foreground text-xs mt-2 flex-1">{lvl.desc}</p>
                </div>
              ))}
            </StaggerChildren>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <ParallaxSection className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="mb-8">
            <p className="eyebrow mb-2">Earn your badges</p>
            <h2 className="display-title text-3xl md:text-4xl">Achievement Unlocks</h2>
          </FadeIn>
          <StaggerChildren className="dashboard-grid cols-4">
            {ACHIEVEMENTS.map((a) => {
              const Icon = a.icon
              return (
                <div key={a.id} className="glass interactive-lift card-athletic flex h-full min-h-[11rem] flex-col rounded-2xl p-5">
                  <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-bold text-white">{a.label}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{a.desc}</p>
                </div>
              )
            })}
          </StaggerChildren>
        </div>
      </ParallaxSection>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="eyebrow mb-3">Your path, simplified</p>
            <h2 className="display-title text-3xl md:text-5xl mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Three simple steps to transform your fitness journey</p>
            <p className="workout-label mt-3 text-primary/60">SETS · REPS · RESULTS</p>
          </FadeIn>
          <StaggerChildren className="grid md:grid-cols-3 gap-8">
            {STEPS.map(s => (
              <div key={s.step} className="glass interactive-lift card-athletic rounded-2xl p-8 text-center">
                <FitnessBadge variant="pr" className="mb-4">{s.step}</FitnessBadge>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-y border-white/[.05] bg-white/[.012]">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="eyebrow mb-3">One connected ecosystem</p>
            <h2 className="display-title text-3xl md:text-5xl">Everything You Need</h2>
          </FadeIn>
          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
              <div key={f.title} className="elite-panel interactive-lift card-athletic flex h-full min-h-[12rem] flex-col rounded-2xl p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/[.08] text-primary">
                  <Icon className="size-5" strokeWidth={2.2} />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm flex-1">{f.desc}</p>
              </div>
            )})}
          </StaggerChildren>
        </div>
      </section>

      {/* Trainers */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black">Featured Trainers</h2>
              <p className="text-muted-foreground mt-2">Verified professionals ready to coach you</p>
            </div>
            <Link href="/coaching" className="text-primary text-sm font-medium hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl bg-muted" />)}
            </div>
          ) : trainers.length === 0 ? (
            <EmptyState
              icon={<Search className="size-7" />}
              tagline="Coaches loading"
              title="No featured trainers yet"
              description="Browse the marketplace to find verified coaches near you."
              action={
                <Link href="/coaching" className="btn-accent px-6 py-2.5 text-sm">
                  Find trainers
                </Link>
              }
            />
          ) : (
            <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trainers.map(t => (
                <div key={t._id} className="group elite-panel interactive-lift card-athletic rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative w-14 h-14 rounded-full bg-muted overflow-hidden flex-shrink-0">
                      {t.profileImage ? (
                        <Image src={t.profileImage} alt={t.name} fill sizes="56px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary font-bold">{t.name[0]}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold group-hover:text-primary transition-colors">{t.name}</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">{t.gymName || t.country}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.specialty?.slice(0, 2).map(s => (
                          <span key={s} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                      <div className="text-primary text-sm mt-2">★ {t.rating?.toFixed(1) || '5.0'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </StaggerChildren>
          )}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 border-y border-white/[.05] bg-white/[.012]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-4">Simple Pricing</h2>
          <p className="text-muted-foreground text-center mb-12">Start free, upgrade when you&apos;re ready</p>
          <StaggerChildren className="grid md:grid-cols-3 gap-6">
            {MARKETING_PLANS.map(p => (
              <div key={p.name} className={`interactive-lift card-athletic rounded-2xl p-8 border ${p.highlight ? 'border-primary/50 bg-primary/[.055] shadow-[0_20px_70px_rgba(34,245,154,.08)]' : 'elite-panel'}`}>
                {p.highlight && <Badge className="mb-4 bg-primary text-black">Most Popular</Badge>}
                <h3 className="text-xl font-bold">{p.name}</h3>
                <div className="text-3xl font-black mt-2 mb-6">{p.price}</div>
                <ul className="space-y-3 mb-8">
                  {p.features.map(f => (
                    <li key={f} className="text-muted-foreground text-sm flex items-center gap-2">
                      <span className="text-primary">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/subscription" className={`block text-center py-3 rounded-full font-bold transition-colors ${p.highlight ? 'btn-accent' : 'border border-border hover:border-primary/50'}`}>
                  Choose {p.name}
                </Link>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <FadeIn>
          <div className="page-hero max-w-4xl mx-auto text-center p-12 md:p-16">
            <p className="eyebrow mb-3">Your strongest chapter starts now</p>
            <h2 className="display-title text-3xl md:text-5xl mb-4">Ready to Transform?</h2>
            <p className="text-muted-foreground mb-2">Join thousands of Pakistanis achieving their fitness goals with T.E.S.T.</p>
            <p className="workout-label mb-8 text-primary/70">Show up · Stack wins · Repeat</p>
            <Link href="/signup" className="btn-accent px-10 py-4 text-base font-bold inline-block">Start Your Journey</Link>
          </div>
        </FadeIn>
      </section>
    </div>
  )
}

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [allowMarketing] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('marketing') === '1'
  })

  useEffect(() => {
    if (isLoading || !user || allowMarketing) return
    switch (user.role) {
      case 'admin':
      case 'super_admin':
        router.replace('/admin')
        break
      case 'trainer':
        router.replace('/trainer-dashboard')
        break
      case 'gym_owner':
        router.replace('/gym-owner')
        break
      default:
        router.replace('/dashboard')
    }
  }, [isLoading, user, router, allowMarketing])

  if (isLoading || (user && !allowMarketing)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <GuestPage />
}
