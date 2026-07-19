'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronDown, Sparkles, Utensils } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { canAccessMealPlansForUser } from '@/lib/access'
import { PageLoader } from '@/components/shared/PageLoader'
import { AccessGate, SignInGate } from '@/components/shared/AccessGate'
import { FadeIn } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { FormSelect } from '@/components/ui/form-select'
import { Skeleton } from '@/components/ui/skeleton'

interface MealItem {
  mealType: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  notes?: string
}

interface MealPlan {
  _id: string
  title: string
  goal: string
  dailyCalories: number
  status: 'draft' | 'active'
  preferenceNotes?: string
  trainerId?: string
  days: Array<{ day: string; meals: MealItem[] }>
  createdAt?: string
}

const GOALS = [
  { value: 'weight_loss', label: 'Weight loss' },
  { value: 'muscle_gain', label: 'Muscle gain' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'general_fitness', label: 'General fitness' },
]

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']

function dayCalories(meals: MealItem[]) {
  return meals.reduce((sum, m) => sum + (m.calories || 0), 0)
}

function sortMeals(meals: MealItem[]) {
  return [...meals].sort(
    (a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType),
  )
}

export default function MealPlansPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})
  const [showGenerate, setShowGenerate] = useState(false)
  const [form, setForm] = useState({ goal: 'general_fitness', preferenceNotes: '' })

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/meal-plans')
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load plans')
      setPlans(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load meal plans')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && canAccessMealPlansForUser(user)) loadPlans()
  }, [user, loadPlans])

  const activePlan = useMemo(
    () => plans.find((p) => p.status === 'active') || plans[0] || null,
    [plans],
  )

  useEffect(() => {
    if (!activePlan?.days?.length) return
    setExpandedDays({ [activePlan.days[0].day]: true })
  }, [activePlan?._id])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to generate')
      toast.success('Meal plan generated')
      setShowGenerate(false)
      await loadPlans()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => ({ ...prev, [day]: !prev[day] }))
  }

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in for meal plans" />

  if (!canAccessMealPlansForUser(user)) {
    return (
      <AccessGate
        icon={Sparkles}
        title="Pro feature"
        description="Personalized meal plans are available on Pro and Elite. Upgrade to generate weekly nutrition schedules tuned to your goals."
        action={<Link href="/subscription" className="btn-accent px-8 py-3 text-sm">Upgrade plan</Link>}
      />
    )
  }

  return (
    <div className="min-h-screen pt-6 pb-28 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <FadeIn>
          <div className="page-hero mb-6 px-6 py-8 sm:px-8 gym-floor">
            <p className="eyebrow mb-2">Nutrition OS</p>
            <h1 className="display-title text-3xl md:text-4xl">Meal Plans</h1>
            <p className="mt-2 text-muted-foreground">
              Follow your trainer-assigned plan — or generate one if you&apos;re on Pro/Elite.
            </p>
          </div>
        </FadeIn>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 bg-muted" />
            <Skeleton className="h-24 bg-muted" />
            <Skeleton className="h-24 bg-muted" />
            <Skeleton className="h-24 bg-muted" />
          </div>
        ) : !activePlan ? (
          <Card className="elite-panel border-white/[.08]">
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <Utensils className="size-10 text-muted-foreground" />
              <div>
                <p className="text-base font-semibold text-white">
                  No meal plan yet. Ask your trainer to create one.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Or generate a personalized plan yourself if your subscription allows.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/coaching" className="btn-accent px-6 py-2.5 text-sm font-bold">
                  Find a trainer
                </Link>
                <Button type="button" variant="outline" onClick={() => setShowGenerate(true)}>
                  Self-generate
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="elite-panel border-white/[.08]">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-white">{activePlan.title}</CardTitle>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {activePlan.goal.replace(/_/g, ' ')} · {activePlan.dailyCalories} kcal / day
                    {activePlan.trainerId ? ' · Assigned by trainer' : ' · Self-generated'}
                  </p>
                </div>
                <Badge variant={activePlan.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  {activePlan.status}
                </Badge>
              </CardHeader>
            </Card>

            <div className="space-y-3">
              {activePlan.days?.map((day) => {
                const total = dayCalories(day.meals)
                const target = activePlan.dailyCalories || 1
                const percent = Math.min(100, Math.round((total / target) * 100))
                const open = Boolean(expandedDays[day.day])

                return (
                  <div
                    key={day.day}
                    className="overflow-hidden rounded-2xl border border-white/[.08] bg-black/20"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDay(day.day)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="font-bold text-white">{day.day}</h3>
                          <span className="text-xs text-muted-foreground">
                            {total} / {target} kcal
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              background: 'linear-gradient(90deg, #00ff87, #00d4ff)',
                            }}
                          />
                        </div>
                      </div>
                      <ChevronDown
                        className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                          open ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {open && (
                      <div className="space-y-2 border-t border-white/[.06] px-4 py-4">
                        {sortMeals(day.meals).map((meal, idx) => (
                          <div
                            key={`${day.day}-${meal.mealType}-${idx}`}
                            className="rounded-xl border border-white/[.06] bg-black/25 px-3 py-3"
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                              {meal.mealType}
                            </p>
                            <p className="mt-0.5 text-sm font-medium text-white">{meal.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowGenerate((v) => !v)}>
                {showGenerate ? 'Hide generator' : 'Generate another plan'}
              </Button>
              <Link href="/coaching" className="text-sm text-primary hover:underline self-center">
                Ask your trainer
              </Link>
            </div>
          </div>
        )}

        {showGenerate && (
          <Card className="elite-panel mt-6 border-white/[.08]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Utensils className="size-4 text-primary" />
                Generate plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <Label htmlFor="goal">Goal</Label>
                  <FormSelect
                    id="goal"
                    value={form.goal}
                    onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                    className="mt-1.5"
                  >
                    {GOALS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </FormSelect>
                </div>
                <div>
                  <Label htmlFor="prefs">Preference notes</Label>
                  <textarea
                    id="prefs"
                    value={form.preferenceNotes}
                    onChange={(e) => setForm((f) => ({ ...f, preferenceNotes: e.target.value }))}
                    rows={3}
                    placeholder="e.g. high protein, no shellfish, vegetarian dinners…"
                    className="mt-1.5 w-full rounded-xl border border-white/[.09] bg-black/20 px-3.5 py-2 text-sm text-foreground outline-none focus-visible:border-primary/45 focus-visible:ring-3 focus-visible:ring-ring/15"
                  />
                </div>
                <Button type="submit" disabled={generating} className="w-full">
                  {generating ? 'Generating…' : 'Generate meal plan'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
