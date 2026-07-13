'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Sparkles, Trash2, CheckCircle2, Pencil, Utensils } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { canAccessMealPlansForUser } from '@/lib/access'
import { PageLoader } from '@/components/shared/PageLoader'
import { AccessGate, SignInGate } from '@/components/shared/AccessGate'
import { FadeIn } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  days: Array<{ day: string; meals: MealItem[] }>
  createdAt?: string
}

const GOALS = [
  { value: 'weight_loss', label: 'Weight loss' },
  { value: 'muscle_gain', label: 'Muscle gain' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'general_fitness', label: 'General fitness' },
]

export default function MealPlansPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [plans, setPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [saving, setSaving] = useState(false)
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

  const selected = plans.find((p) => p._id === selectedId) || null

  useEffect(() => {
    if (selected) setEditingTitle(selected.title)
  }, [selected])

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
      setSelectedId(data._id)
      await loadPlans()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleActivate = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/meal-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to activate')
      toast.success('Plan activated')
      await loadPlans()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Activate failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTitle = async () => {
    if (!selected || !editingTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/meal-plans/${selected._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save')
      toast.success('Plan updated')
      await loadPlans()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meal plan?')) return
    try {
      const res = await fetch(`/api/meal-plans/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete')
      toast.success('Plan deleted')
      if (selectedId === id) setSelectedId(null)
      await loadPlans()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
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
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="page-hero mb-6 px-6 py-8 sm:px-8 gym-floor">
            <p className="eyebrow mb-2">Nutrition OS</p>
            <h1 className="display-title text-3xl md:text-4xl">Personalized Meal Plans</h1>
            <p className="mt-2 text-muted-foreground">
              Generate a weekly menu from your goals, calories, and preferences — then activate the one you want to follow.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-6">
            <Card className="elite-panel border-white/[.08]">
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

            <Card className="elite-panel border-white/[.08]">
              <CardHeader>
                <CardTitle className="text-base">Your plans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <Skeleton className="h-20 bg-muted" />
                ) : plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No plans yet — generate your first one.</p>
                ) : (
                  plans.map((plan) => (
                    <button
                      key={plan._id}
                      type="button"
                      onClick={() => setSelectedId(plan._id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                        selectedId === plan._id
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-white/[.08] bg-black/20 hover:border-white/[.14]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{plan.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                            {plan.goal.replace(/_/g, ' ')} · {plan.dailyCalories} kcal
                          </p>
                        </div>
                        <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                          {plan.status}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="elite-panel border-white/[.08] min-h-[420px]">
            <CardHeader>
              <CardTitle className="text-base">
                {selected ? 'Plan detail' : 'Select a plan'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="text-sm text-muted-foreground">Choose a plan from the list or generate a new one.</p>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={handleSaveTitle}>
                        <Pencil className="size-3.5" />
                        Save
                      </Button>
                      {selected.status !== 'active' && (
                        <Button type="button" size="sm" disabled={saving} onClick={() => handleActivate(selected._id)}>
                          <CheckCircle2 className="size-3.5" />
                          Activate
                        </Button>
                      )}
                      <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(selected._id)}>
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-lg border border-white/[.08] px-2.5 py-1 capitalize">
                      {selected.goal.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded-lg border border-white/[.08] px-2.5 py-1">
                      {selected.dailyCalories} kcal / day
                    </span>
                    <span className="rounded-lg border border-white/[.08] px-2.5 py-1 capitalize">
                      {selected.status}
                    </span>
                  </div>

                  {selected.preferenceNotes && (
                    <p className="text-sm text-muted-foreground">
                      Preferences: {selected.preferenceNotes}
                    </p>
                  )}

                  <div className="space-y-4">
                    {selected.days?.map((day) => (
                      <div key={day.day} className="rounded-xl border border-white/[.08] bg-black/15 p-4">
                        <h3 className="mb-3 text-sm font-bold text-primary">{day.day}</h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {day.meals.map((meal, idx) => (
                            <div key={`${day.day}-${idx}`} className="rounded-lg border border-white/[.06] px-3 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                {meal.mealType}
                              </p>
                              <p className="text-sm font-medium text-white">{meal.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                              </p>
                              {meal.notes && (
                                <p className="mt-1 text-[11px] text-muted-foreground/80">{meal.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
