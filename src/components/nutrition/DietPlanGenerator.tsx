'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { canAccessMealPlansForUser } from '@/lib/access'

interface DietPlan {
  _id: string
  title: string
  dailyCalories: number
  days: { day: string; meals: { mealType: string; name: string; calories: number; protein: number; carbs: number; fat: number }[] }[]
}

export function DietPlanGenerator() {
  const { user } = useAuth()
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState<DietPlan | null>(null)
  const [error, setError] = useState('')
  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const response = await fetch('/api/meal-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal: user?.fitnessGoal || 'general_fitness' }), signal: AbortSignal.timeout(20000) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to generate your diet plan')
      setPlan(data)
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== 'TimeoutError' ? cause.message : 'Generation timed out. Please try again.')
    } finally { setGenerating(false) }
  }
  return <section aria-label="Diet plan generator" className="tile space-y-4">
    <h2 className="text-2xl font-bold text-foreground">Generate My Diet Plan</h2>
    <p className="text-sm text-muted-foreground">Create a seven-day meal schedule using your saved goal, weight, and activity level. Nutrition values are estimates.</p>
    {canAccessMealPlansForUser(user) ? <button type="button" onClick={() => void generate()} disabled={generating} className="btn-accent w-full disabled:opacity-50">{generating ? 'Generating diet plan…' : 'Generate diet plan'}</button> : <Link href="/subscription" className="btn-accent">Get Pro or Elite for diet plans</Link>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {plan && <div role="status" className="space-y-3"><h3 className="font-bold">{plan.title}</h3><p className="text-sm text-muted-foreground">Saved · {plan.days.length} days · {plan.dailyCalories} kcal/day</p>{plan.days.map(day => <details key={day.day} className="rounded-xl border border-border p-3"><summary className="cursor-pointer font-semibold text-foreground">{day.day}</summary><ul className="mt-3 space-y-2">{day.meals.map(meal => <li key={meal.mealType} className="text-sm"><span className="capitalize text-primary">{meal.mealType}: </span>{meal.name}<p className="text-xs text-muted-foreground">{meal.calories} kcal per planned serving · Protein {meal.protein}g · Carbs {meal.carbs}g · Fat {meal.fat}g</p></li>)}</ul></details>)}<Link href="/meal-plans" className="inline-block font-semibold text-primary">Open saved meal plans →</Link></div>}
  </section>
}
