'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Trainer, WorkoutPlan } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

const STATS = [
  { value: '500+', label: 'Verified Trainers' },
  { value: '10K+', label: 'Active Users' },
  { value: '95%', label: 'Goal Success Rate' },
  { value: '24/7', label: 'AI Coach Access' },
]

const STEPS = [
  { step: '01', title: 'Sign Up', desc: 'Create your free account and set your fitness goals.' },
  { step: '02', title: 'Find a Trainer', desc: 'Browse verified trainers and send a coaching request.' },
  { step: '03', title: 'Train & Track', desc: 'Follow personalized plans, log meals, and track progress.' },
]

const FEATURES = [
  { icon: '🤖', title: 'AI Coaching', desc: 'Get instant workout and nutrition advice powered by AI.' },
  { icon: '🏋️', title: 'Verified Trainers', desc: 'Connect with certified professionals across Pakistan.' },
  { icon: '🥗', title: 'Nutrition Tracking', desc: 'Log meals, analyze macros, and hit your calorie targets.' },
  { icon: '📊', title: 'Progress Analytics', desc: 'Visualize weight, body fat, and workout consistency.' },
  { icon: '💬', title: 'Direct Chat', desc: 'Message your trainer in real-time for guidance.' },
  { icon: '🏢', title: 'Gym Partnerships', desc: 'Find trainers at verified gyms near you.' },
]

const PLANS = [
  { name: 'Basic', price: 'Free', features: ['AI chatbot', 'Exercise library', 'Basic tracking'], highlight: false },
  { name: 'Pro', price: 'Rs 999/mo', features: ['Everything in Basic', '1 trainer connection', 'Meal analysis', 'Progress charts'], highlight: true },
  { name: 'Elite', price: 'Rs 2,499/mo', features: ['Everything in Pro', 'Unlimited trainers', 'Priority support', 'Custom plans'], highlight: false },
]

function GuestPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/trainers?limit=6&featured=true')
      .then(r => r.json())
      .then(data => setTrainers(Array.isArray(data) ? data : []))
      .catch(() => setTrainers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00ff87]/5 via-transparent to-[#00bfff]/5" />
        <div className="max-w-6xl mx-auto relative text-center">
          <Badge className="mb-6 bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20">Pakistan&apos;s #1 Fitness Platform</Badge>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Train. Eat. Sleep.<br />
            <span className="gradient-text">Thrive.</span>
          </h1>
          <p className="text-[#a0a0a0] text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Connect with verified trainers, track nutrition with AI, and achieve your fitness goals — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-accent px-8 py-4 text-base font-bold">Get Started Free</Link>
            <Link href="/coaching" className="px-8 py-4 rounded-full border border-[#2a2a2a] text-white hover:border-[#00ff87]/50 transition-colors font-medium">
              Browse Trainers
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-black text-[#00ff87] mb-2">{s.value}</div>
              <div className="text-[#a0a0a0] text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-4">How It Works</h2>
          <p className="text-[#a0a0a0] text-center mb-12 max-w-xl mx-auto">Three simple steps to transform your fitness journey</p>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(s => (
              <div key={s.step} className="glass rounded-2xl p-8 text-center">
                <div className="text-[#00ff87] font-black text-4xl mb-4">{s.step}</div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-[#a0a0a0] text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-[#111]/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">Everything You Need</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-6 hover:border-[#00ff87]/30 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-[#a0a0a0] text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trainers */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black">Featured Trainers</h2>
              <p className="text-[#a0a0a0] mt-2">Verified professionals ready to coach you</p>
            </div>
            <Link href="/coaching" className="text-[#00ff87] text-sm font-medium hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl bg-[#1a1a1a]" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trainers.map(t => (
                <Link key={t._id} href={`/coaching/${t._id}`} className="group bg-[#111] border border-[#1a1a1a] rounded-2xl p-6 hover:border-[#00ff87]/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#1a1a1a] overflow-hidden flex-shrink-0">
                      {t.profileImage ? (
                        <img src={t.profileImage} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#00ff87] font-bold">{t.name[0]}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold group-hover:text-[#00ff87] transition-colors">{t.name}</h3>
                      <p className="text-[#555] text-xs mt-0.5">{t.gymName || t.country}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.specialty?.slice(0, 2).map(s => (
                          <span key={s} className="text-[10px] bg-[#00ff87]/10 text-[#00ff87] px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                      <div className="text-[#00ff87] text-sm mt-2">★ {t.rating?.toFixed(1) || '5.0'}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-[#111]/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-4">Simple Pricing</h2>
          <p className="text-[#a0a0a0] text-center mb-12">Start free, upgrade when you&apos;re ready</p>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map(p => (
              <div key={p.name} className={`rounded-2xl p-8 border ${p.highlight ? 'border-[#00ff87] bg-[#00ff87]/5' : 'border-[#1a1a1a] bg-[#111]'}`}>
                {p.highlight && <Badge className="mb-4 bg-[#00ff87] text-black">Most Popular</Badge>}
                <h3 className="text-xl font-bold">{p.name}</h3>
                <div className="text-3xl font-black mt-2 mb-6">{p.price}</div>
                <ul className="space-y-3 mb-8">
                  {p.features.map(f => (
                    <li key={f} className="text-[#a0a0a0] text-sm flex items-center gap-2">
                      <span className="text-[#00ff87]">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/subscription" className={`block text-center py-3 rounded-full font-bold transition-colors ${p.highlight ? 'btn-accent' : 'border border-[#2a2a2a] hover:border-[#00ff87]/50'}`}>
                  Choose {p.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center glass rounded-3xl p-12">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to Transform?</h2>
          <p className="text-[#a0a0a0] mb-8">Join thousands of Pakistanis achieving their fitness goals with T.E.S.T.</p>
          <Link href="/signup" className="btn-accent px-10 py-4 text-base font-bold inline-block">Start Your Journey</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="font-black text-xl gradient-text">T.E.S.T.</div>
          <div className="flex gap-6 text-[#a0a0a0] text-sm">
            <Link href="/coaching" className="hover:text-white">Trainers</Link>
            <Link href="/exercises" className="hover:text-white">Exercises</Link>
            <Link href="/nutrition" className="hover:text-white">Nutrition</Link>
            <Link href="/subscription" className="hover:text-white">Pricing</Link>
          </div>
          <p className="text-[#555] text-sm">© 2026 T.E.S.T. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function LoggedInDashboard() {
  const { user } = useAuth()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [calories, setCalories] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/tracking/plans/my-plan').then(r => r.ok ? r.json() : null),
      fetch('/api/tracking/meal-logs/today').then(r => r.ok ? r.json() : { totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } }),
    ]).then(([planData, mealData]) => {
      if (planData?.plan === null) setPlan(null)
      else if (planData?._id) setPlan(planData)
      else if (planData?.plan) setPlan(planData.plan)
      setCalories(mealData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 })
    }).finally(() => setLoading(false))
  }, [])

  const calorieGoal = 2000
  const caloriePct = Math.min(100, Math.round((calories.calories / calorieGoal) * 100))

  const quickActions = [
    { href: '/my-fitness', icon: '📊', label: 'My Fitness' },
    { href: '/nutrition', icon: '🥗', label: 'Log Meal' },
    { href: '/coaching', icon: '🏋️', label: 'Find Trainer' },
    { href: '/chat', icon: '💬', label: 'Messages' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-28 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black">
            Welcome back, <span className="gradient-text">{user?.fullName?.split(' ')[0] || 'Athlete'}</span> 👋
          </h1>
          <p className="text-[#a0a0a0] mt-2">Here&apos;s your fitness snapshot for today</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map(a => (
            <Link key={a.href} href={a.href} className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-5 hover:border-[#00ff87]/40 transition-all text-center">
              <div className="text-3xl mb-2">{a.icon}</div>
              <div className="font-medium text-sm">{a.label}</div>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Active Plan */}
          <Card className="bg-[#111] border-[#1a1a1a] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🏋️</span> Active Workout Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-24 bg-[#1a1a1a]" />
              ) : plan ? (
                <div>
                  <h3 className="font-bold text-lg text-[#00ff87]">{plan.title}</h3>
                  <p className="text-[#a0a0a0] text-sm mt-1 capitalize">{plan.goal?.replace('_', ' ')} · {plan.difficulty} · {plan.durationWeeks} weeks</p>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {plan.weeklySchedule?.slice(0, 4).map(d => (
                      <Badge key={d.day} variant="outline" className="border-[#2a2a2a] text-[#a0a0a0]">
                        {d.day}: {d.isRestDay ? 'Rest' : `${d.exercises?.length || 0} exercises`}
                      </Badge>
                    ))}
                  </div>
                  <Link href="/my-fitness" className="inline-block mt-4 text-[#00ff87] text-sm font-medium hover:underline">View full plan →</Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-[#a0a0a0] mb-4">No active workout plan yet</p>
                  <Link href="/coaching" className="btn-accent px-6 py-2 text-sm">Find a Trainer</Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Calories */}
          <Card className="bg-[#111] border-[#1a1a1a] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🔥</span> Today&apos;s Calories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-24 bg-[#1a1a1a]" />
              ) : (
                <div>
                  <div className="flex items-end justify-between mb-3">
                    <span className="text-4xl font-black text-[#00ff87]">{calories.calories}</span>
                    <span className="text-[#a0a0a0] text-sm">/ {calorieGoal} kcal goal</span>
                  </div>
                  <Progress value={caloriePct} className="mb-4">
                    <ProgressTrack className="bg-[#1a1a1a] h-2">
                      <ProgressIndicator className="bg-[#00ff87]" />
                    </ProgressTrack>
                  </Progress>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-[#00ff87] font-bold">{Math.round(calories.protein)}g</div>
                      <div className="text-[#555] text-xs">Protein</div>
                    </div>
                    <div>
                      <div className="text-[#00bfff] font-bold">{Math.round(calories.carbs)}g</div>
                      <div className="text-[#555] text-xs">Carbs</div>
                    </div>
                    <div>
                      <div className="text-[#ff6b6b] font-bold">{Math.round(calories.fat)}g</div>
                      <div className="text-[#555] text-xs">Fat</div>
                    </div>
                  </div>
                  <Link href="/nutrition" className="inline-block mt-4 text-[#00ff87] text-sm font-medium hover:underline">Log a meal →</Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00ff87] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user && user.role === 'user') return <LoggedInDashboard />
  if (user && user.role !== 'user') {
    const dashMap: Record<string, string> = {
      trainer: '/trainer-dashboard',
      gym_owner: '/gym-owner',
      admin: '/admin',
      super_admin: '/admin',
    }
    const href = dashMap[user.role] || '/my-fitness'
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-28 px-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-black mb-4">Welcome, {user.fullName}</h1>
          <p className="text-[#a0a0a0] mb-6">Go to your dashboard to manage your account</p>
          <Link href={href} className="btn-accent px-8 py-3">Open Dashboard</Link>
        </div>
      </div>
    )
  }

  return <GuestPage />
}
