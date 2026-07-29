'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { WorkoutPlan, ProgressRecord, MealLog } from '@/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartTheme } from '@/lib/chart-theme'
import { PageLoader } from '@/components/shared/PageLoader'
import { SignInGate } from '@/components/shared/AccessGate'
import { GamificationBar } from '@/components/gamification/GamificationBar'
import type { GamificationMeResponse } from '@/types/gamification'
import { AIGeneratorTab } from './AIGeneratorTab'

interface FoodResult {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  per: string
}

function getBodyPart(exerciseName: string): string {
  const name = exerciseName.toLowerCase()
  if (['push', 'bench', 'chest', 'shoulder', 'tricep', 'bicep', 'curl', 'press', 'pull', 'row', 'lat'].some((k) => name.includes(k))) {
    return 'Upper Body'
  }
  if (['squat', 'lunge', 'deadlift', 'leg', 'calf', 'glute', 'hip', 'hamstring', 'quad'].some((k) => name.includes(k))) {
    return 'Lower Body'
  }
  if (['plank', 'crunch', 'core', 'ab', 'russian', 'mountain', 'twist'].some((k) => name.includes(k))) {
    return 'Core'
  }
  if (['burpee', 'jump', 'cardio', 'run', 'sprint', 'climber'].some((k) => name.includes(k))) {
    return 'Cardio'
  }
  return 'Full Body'
}

function groupExercisesByBodyPart<T extends { name: string }>(exercises: T[]) {
  const groups: Record<string, T[]> = {}
  for (const ex of exercises) {
    const part = getBodyPart(ex.name)
    if (!groups[part]) groups[part] = []
    groups[part].push(ex)
  }
  return groups
}

export default function MyFitnessInner({
  initialTab,
  planId,
}: {
  initialTab: string
  planId: string | null
}) {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const tab = ['workout', 'nutrition', 'progress', 'ai-generator'].includes(initialTab) ? initialTab : 'workout'

  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [progress, setProgress] = useState<ProgressRecord[]>([])
  const [meals, setMeals] = useState<{ meals: MealLog[]; totals: { calories: number; protein: number; carbs: number; fat: number } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [weightForm, setWeightForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    weight: '',
    bodyFat: '',
    notes: '',
  })
  const [workoutHistory, setWorkoutHistory] = useState<{
    logs: Array<{ _id: string; date: string; durationMinutes?: number; exercises?: Array<{ name: string }>; plan?: { title?: string } }>
    streak: number
    totalCompleted: number
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [workoutStarted, setWorkoutStarted] = useState(false)
  const [activeLogId, setActiveLogId] = useState<string | null>(null)
  const [startingWorkout, setStartingWorkout] = useState(false)
  const [completedExercises, setCompletedExercises] = useState<number[]>([])
  const [completingWorkout, setCompletingWorkout] = useState(false)
  const [foodSearch, setFoodSearch] = useState('')
  const [foodResults, setFoodResults] = useState<FoodResult[]>([])
  const [searchingFood, setSearchingFood] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null)
  const [mealType, setMealType] = useState('breakfast')
  const [foodQuantity, setFoodQuantity] = useState('100')
  const [loggingMeal, setLoggingMeal] = useState(false)
  const [gamification, setGamification] = useState<GamificationMeResponse | null>(null)
  const [showLogMeal, setShowLogMeal] = useState(false)
  const [activeTab, setActiveTab] = useState(tab)

  useEffect(() => {
    setActiveTab(tab)
  }, [tab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams()
    params.set('tab', value)
    if (planId && value === 'workout') params.set('planId', planId)
    router.replace(`/my-fitness?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (!planId) return
    setActiveTab('workout')
    router.replace(`/my-fitness?tab=workout&planId=${encodeURIComponent(planId)}`, { scroll: false })
  }, [planId, router])

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 8000)
    setLoading(true)
    setLoadError(null)

    Promise.all([
      fetch('/api/tracking/plans/my-plan', { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/tracking/progress', { signal: controller.signal }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/tracking/meal-logs/today', { signal: controller.signal }).then((r) =>
        r.ok ? r.json() : { meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
      ),
      fetch('/api/tracking/logs?limit=10', { signal: controller.signal }).then((r) =>
        r.ok ? r.json() : { logs: [], streak: 0, totalCompleted: 0 },
      ),
      fetch('/api/gamification/me', { signal: controller.signal }).then((r) => (r.ok ? r.json() : null)),
      // Restore today's in-progress workout (if any) so the checklist
      // survives a reload/revisit instead of resetting to empty.
      fetch('/api/tracking/logs/active', { signal: controller.signal }).then((r) => (r.ok ? r.json() : { log: null })),
    ])
      .then(([planData, progressData, mealData, historyData, gamificationData, activeData]) => {
        if (planData?.plan === null) setPlan(null)
        else if (planData?._id) setPlan(planData)
        else if (planData?.plan) setPlan(planData.plan)
        setProgress(Array.isArray(progressData) ? progressData : [])
        setMeals(mealData)
        setWorkoutHistory(historyData)
        if (gamificationData?.xp !== undefined) setGamification(gamificationData)

        const activeLog = activeData?.log as
          | { _id: string; exercises?: Array<{ completed?: boolean }> }
          | null
          | undefined
        if (activeLog?._id) {
          setActiveLogId(activeLog._id)
          setWorkoutStarted(true)
          setCompletedExercises(
            (activeLog.exercises || [])
              .map((exercise, index) => (exercise.completed ? index : -1))
              .filter((index) => index !== -1),
          )
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (timedOut) setLoadError('Request timed out. Please try again.')
          return
        }
        setLoadError('Failed to load fitness data.')
      })
      .finally(() => {
        clearTimeout(timeout)
        setLoading(false)
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [user, refreshKey])

  const reloadData = () => setRefreshKey((k) => k + 1)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todaySchedule = plan?.weeklySchedule?.find((d) => d.day.toLowerCase() === today.toLowerCase())
  const todayGrouped = useMemo(
    () => (todaySchedule?.exercises ? groupExercisesByBodyPart(todaySchedule.exercises) : {}),
    [todaySchedule],
  )

  const chartData = progress.map((r) => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: r.weight,
    bodyFat: r.bodyFat,
  }))

  const recentProgress = useMemo(
    () => [...progress].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [progress],
  )

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!weightForm.weight) return toast.error('Weight is required')
    if (!weightForm.date) return toast.error('Date is required')
    setSaving(true)
    try {
      const res = await fetch('/api/tracking/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: parseFloat(weightForm.weight),
          bodyFat: weightForm.bodyFat ? parseFloat(weightForm.bodyFat) : undefined,
          notes: weightForm.notes || undefined,
          date: weightForm.date,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to save progress')
      }
      toast.success('Progress logged!')
      setWeightForm({
        date: new Date().toISOString().slice(0, 10),
        weight: '',
        bodyFat: '',
        notes: '',
      })
      reloadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save progress')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProgress = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/tracking/progress/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to delete')
      toast.success('Progress entry deleted')
      reloadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete progress')
    } finally {
      setDeletingId(null)
    }
  }

  const handleStartWorkout = async () => {
    if (!plan) return
    setStartingWorkout(true)
    try {
      const exercises =
        todaySchedule && !todaySchedule.isRestDay
          ? todaySchedule.exercises.map((exercise) => ({
              name: exercise.name,
              setsCompleted: 0,
              repsCompleted: exercise.reps,
            }))
          : []
      const res = await fetch('/api/tracking/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan._id,
          date: new Date().toISOString(),
          exercises,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to start workout')
      const logId = data.log?._id as string | undefined
      if (!logId) throw new Error('Workout log id missing')
      setActiveLogId(logId)
      setWorkoutStarted(true)
      setCompletedExercises([])
      toast.success('Workout started')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start workout')
    } finally {
      setStartingWorkout(false)
    }
  }

  const handleToggleExercise = (index: number, checked: boolean) => {
    // Optimistic local update so the checkbox feels instant...
    setCompletedExercises((current) =>
      checked ? [...current, index] : current.filter((i) => i !== index),
    )
    // ...then persist to the in-progress log so a reload/revisit doesn't
    // lose the checklist (see BUG_REPORT.md).
    if (!activeLogId) return
    fetch(`/api/tracking/logs/${activeLogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseIndex: index, completed: checked }),
    }).catch(() => {
      toast.error('Could not save checklist — check your connection')
    })
  }

  const handleCancelWorkout = () => {
    const logId = activeLogId
    setWorkoutStarted(false)
    setActiveLogId(null)
    setCompletedExercises([])
    if (logId) {
      fetch(`/api/tracking/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped' }),
      }).catch(() => {})
    }
  }

  const handleCompleteWorkout = async () => {
    if (!plan || !todaySchedule || todaySchedule.isRestDay) return
    if (!activeLogId) {
      toast.error('Start the workout first')
      return
    }
    if (completedExercises.length === 0) {
      toast.error('Complete at least one exercise first')
      return
    }
    setCompletingWorkout(true)
    try {
      const exercises = todaySchedule.exercises
        .filter((_, index) => completedExercises.includes(index))
        .map((exercise) => ({
          name: exercise.name,
          setsCompleted: exercise.sets,
          repsCompleted: exercise.reps,
        }))
      const res = await fetch(`/api/tracking/logs/${activeLogId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercises }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success(`Workout completed!${data.xpAwarded ? ` +${data.xpAwarded} XP` : ''}`)
      setWorkoutStarted(false)
      setActiveLogId(null)
      setCompletedExercises([])
      reloadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete workout')
    } finally {
      setCompletingWorkout(false)
    }
  }

  const searchFood = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foodSearch.trim()) return
    setSearchingFood(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(`/api/nutrition/analyze?query=${encodeURIComponent(foodSearch.trim())}`, {
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setFoodResults(Array.isArray(data.results) ? data.results : [])
    } catch {
      setFoodResults([])
      toast.error('Food search failed')
    } finally {
      setSearchingFood(false)
    }
  }

  const logFood = async () => {
    if (!selectedFood) return
    const quantity = Number(foodQuantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter a valid quantity')
      return
    }
    const ratio = quantity / 100
    setLoggingMeal(true)
    try {
      const res = await fetch('/api/tracking/meal-logs/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType,
          foods: [
            {
              name: selectedFood.name,
              calories: Math.round(selectedFood.calories * ratio),
              protein: Math.round(selectedFood.protein * ratio * 10) / 10,
              carbs: Math.round(selectedFood.carbs * ratio * 10) / 10,
              fat: Math.round(selectedFood.fat * ratio * 10) / 10,
              quantity,
              unit: 'g',
            },
          ],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success(`Meal logged${data.xpAwarded ? ` +${data.xpAwarded} XP` : ''}`)
      setSelectedFood(null)
      setFoodResults([])
      setFoodSearch('')
      setShowLogMeal(false)
      reloadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log meal')
    } finally {
      setLoggingMeal(false)
    }
  }

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to view fitness" />

  return (
    <div className="min-h-screen overflow-x-hidden px-4 pb-28 pt-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6 overflow-x-hidden">
        <div className="page-hero px-6 py-8 sm:px-8">
          <p className="eyebrow mb-2">Performance Hub</p>
          <h1 className="display-title text-3xl md:text-4xl">My Fitness</h1>
          <p className="mt-2 text-muted-foreground">Train, fuel, and measure every win</p>
        </div>

        <GamificationBar data={gamification} />

        {loadError && (
          <div className="tile flex flex-wrap items-center justify-between gap-3 border-amber-500/30 bg-amber-500/5">
            <p className="text-sm text-amber-200">{loadError}</p>
            <Button size="sm" variant="outline" onClick={reloadData}>
              Retry
            </Button>
          </div>
        )}

        <div className="stat-card-grid">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="tile min-h-[8.5rem] space-y-3">
                  <Skeleton className="h-3 w-28 bg-muted" />
                  <Skeleton className="h-8 w-16 bg-muted" />
                  <Skeleton className="h-3 w-24 bg-muted" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="tile min-h-[8.5rem]">
                <p className="text-xs uppercase tracking-wider text-[#a0a0a0]">Today&apos;s Calories</p>
                <p className="mt-2 text-3xl font-black text-primary">{meals?.totals.calories || 0}</p>
                <p className="mt-auto pt-2 text-xs text-[#a0a0a0]">kcal logged today</p>
              </div>
              <div className="tile min-h-[8.5rem]">
                <p className="text-xs uppercase tracking-wider text-[#a0a0a0]">Active Plan</p>
                <p className="mt-2 truncate text-2xl font-black text-primary">{plan?.title || 'None'}</p>
                {plan ? (
                  <p className="mt-auto pt-2 text-xs capitalize text-[#a0a0a0]">
                    {plan.difficulty} · {plan.durationWeeks}w · {plan.status}
                  </p>
                ) : (
                  <p className="mt-auto pt-2 text-xs text-[#a0a0a0]">Assign a plan via coaching</p>
                )}
              </div>
              <div className="tile min-h-[8.5rem]">
                <p className="text-xs uppercase tracking-wider text-[#a0a0a0]">Streak</p>
                <p className="mt-2 text-3xl font-black text-primary">{workoutHistory?.streak ?? 0}</p>
                <p className="mt-auto pt-2 text-xs text-[#a0a0a0]">{workoutHistory?.totalCompleted ?? 0} total sessions</p>
              </div>
            </>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-4 sm:inline-flex sm:w-auto">
            <TabsTrigger value="workout">Workout</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="ai-generator">AI Generator</TabsTrigger>
          </TabsList>

          <TabsContent value="workout">
            {loading ? (
              <Skeleton className="h-64 bg-muted" />
            ) : plan ? (
              <div className="space-y-6">
                <div className="tile min-h-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-white">{plan.title}</h2>
                      <p className="text-sm capitalize text-[#a0a0a0]">
                        {plan.goal?.replace('_', ' ')} · {plan.difficulty}
                      </p>
                    </div>
                    <span className="badge-accent">{plan.status}</span>
                  </div>
                </div>

                {todaySchedule && (
                  <div className="tile">
                    <p className="section-eyebrow">Today — {today}</p>
                    {todaySchedule.isRestDay ? (
                      <p className="text-[#a0a0a0]">Rest day — recover and recharge</p>
                    ) : (
                      <div className="space-y-5">
                        {Object.entries(todayGrouped).map(([part, exercises]) => (
                          <div key={part}>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">{part}</h3>
                            <div className="space-y-2">
                              {exercises.map((ex) => {
                                const globalIndex = todaySchedule.exercises.indexOf(ex)
                                return (
                                  <div
                                    key={`${part}-${globalIndex}`}
                                    className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[.02] p-3"
                                  >
                                    <label className="flex items-center gap-3">
                                      <input
                                        type="checkbox"
                                        checked={completedExercises.includes(globalIndex)}
                                        disabled={!workoutStarted}
                                        onChange={(event) =>
                                          handleToggleExercise(globalIndex, event.target.checked)
                                        }
                                        className="h-4 w-4 accent-primary"
                                      />
                                      <span
                                        className={
                                          completedExercises.includes(globalIndex)
                                            ? 'font-medium text-[#a0a0a0] line-through'
                                            : 'font-medium text-white'
                                        }
                                      >
                                        {ex.name}
                                      </span>
                                    </label>
                                    <span className="text-sm text-[#a0a0a0]">
                                      {ex.sets} × {ex.reps}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-3 pt-2">
                          {!workoutStarted ? (
                            <Button
                              onClick={handleStartWorkout}
                              disabled={startingWorkout}
                              className="bg-primary text-black hover:brightness-95"
                            >
                              {startingWorkout ? 'Starting...' : 'Start Workout'}
                            </Button>
                          ) : (
                            <>
                              <Button
                                onClick={handleCompleteWorkout}
                                disabled={completingWorkout}
                                className="bg-primary text-black hover:brightness-95"
                              >
                                {completingWorkout ? 'Completing...' : 'Complete Workout'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={handleCancelWorkout}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
                  {plan.weeklySchedule?.map((day) => {
                    const grouped = day.isRestDay ? {} : groupExercisesByBodyPart(day.exercises || [])
                    return (
                      <div key={day.day} className="tile min-h-[10rem]">
                        <h3 className="mb-3 font-bold text-white">{day.day}</h3>
                        {day.isRestDay ? (
                          <p className="mt-auto text-sm text-[#a0a0a0]">Rest Day</p>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(grouped).map(([part, exercises]) => (
                              <div key={part}>
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">{part}</p>
                                <ul className="space-y-1">
                                  {exercises.map((ex, i) => (
                                    <li key={i} className="text-sm text-[#a0a0a0]">
                                      {ex.name} — {ex.sets} × {ex.reps}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="tile items-center py-16 text-center">
                <p className="mb-4 text-[#a0a0a0]">No workout plan assigned yet</p>
                <Link href="/coaching" className="btn-accent px-6 py-2">
                  Find a Trainer
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="nutrition">
            {loading ? (
              <Skeleton className="h-48 bg-muted" />
            ) : (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => setShowLogMeal(true)}
                  className="w-full rounded-2xl py-3 font-bold text-black"
                  style={{ background: 'linear-gradient(135deg, #00ff87, #00d4ff)' }}
                >
                  + Log a Meal
                </button>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: 'Calories', value: meals?.totals.calories },
                    { label: 'Protein', value: `${Math.round(meals?.totals.protein || 0)}g` },
                    { label: 'Carbs', value: `${Math.round(meals?.totals.carbs || 0)}g` },
                    { label: 'Fat', value: `${Math.round(meals?.totals.fat || 0)}g` },
                  ].map((m) => (
                    <div key={m.label} className="tile min-h-0 text-center">
                      <p className="text-2xl font-black text-primary">{m.value}</p>
                      <p className="mt-1 text-xs text-[#a0a0a0]">{m.label}</p>
                    </div>
                  ))}
                </div>

                {meals?.meals?.length ? (
                  <div className="space-y-3">
                    {meals.meals.map((m) => (
                      <div key={m._id} className="tile min-h-0 flex-row items-center justify-between py-4">
                        <div>
                          <span className="font-medium capitalize text-white">{m.mealType}</span>
                          <p className="text-sm text-[#a0a0a0]">{m.foods?.map((f) => f.name).join(', ')}</p>
                        </div>
                        <span className="font-bold text-primary">{m.totalCalories} kcal</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-[#a0a0a0]">No meals logged today</p>
                )}
                <Link href="/meal-plans" className="text-sm text-primary hover:underline">
                  Open meal plans →
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress">
            {loading ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <Skeleton className="h-64 bg-muted" />
                <Skeleton className="h-64 bg-muted" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="tile min-h-[280px]">
                    <p className="section-eyebrow">Trend</p>
                    <h3 className="mb-4 font-bold text-white">Weight Progress</h3>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                          <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={12} />
                          <YAxis stroke={chartTheme.axis} fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              background: chartTheme.tooltip.background,
                              border: `1px solid ${chartTheme.tooltip.border}`,
                              borderRadius: chartTheme.tooltip.borderRadius,
                            }}
                          />
                          <Line type="monotone" dataKey="weight" stroke={chartTheme.primary} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-[#a0a0a0]">No progress data yet. Log your first entry.</p>
                    )}
                  </div>

                  <div className="tile">
                    <p className="section-eyebrow">Log</p>
                    <h3 className="mb-4 font-bold text-white">Log Progress</h3>
                    <form onSubmit={handleAddProgress} className="space-y-4">
                      <div>
                        <Label htmlFor="progress-date">Date</Label>
                        <Input
                          id="progress-date"
                          type="date"
                          value={weightForm.date}
                          onChange={(e) => setWeightForm((f) => ({ ...f, date: e.target.value }))}
                          className="mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="weight">Weight (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          value={weightForm.weight}
                          onChange={(e) => setWeightForm((f) => ({ ...f, weight: e.target.value }))}
                          className="mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="bodyFat">Body Fat % (optional)</Label>
                        <Input
                          id="bodyFat"
                          type="number"
                          step="0.1"
                          value={weightForm.bodyFat}
                          onChange={(e) => setWeightForm((f) => ({ ...f, bodyFat: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="progress-notes">Notes (optional)</Label>
                        <Input
                          id="progress-notes"
                          value={weightForm.notes}
                          onChange={(e) => setWeightForm((f) => ({ ...f, notes: e.target.value }))}
                          className="mt-1"
                          placeholder="How are you feeling?"
                        />
                      </div>
                      <Button type="submit" disabled={saving} className="w-full bg-primary text-black hover:brightness-95">
                        {saving ? 'Saving...' : 'Save Progress'}
                      </Button>
                    </form>
                  </div>
                </div>

                <div className="tile">
                  <p className="section-eyebrow">History</p>
                  <h3 className="mb-4 font-bold text-white">Last 5 Entries</h3>
                  {recentProgress.length === 0 ? (
                    <p className="text-sm text-[#a0a0a0]">No entries yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[28rem] text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-[#a0a0a0]">
                            <th className="pb-2 pr-3 font-medium">Date</th>
                            <th className="pb-2 pr-3 font-medium">Weight</th>
                            <th className="pb-2 pr-3 font-medium">Body Fat</th>
                            <th className="pb-2 pr-3 font-medium">Notes</th>
                            <th className="pb-2 font-medium"> </th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentProgress.map((entry) => (
                            <tr key={entry._id} className="border-b border-white/5">
                              <td className="py-3 pr-3 text-white">
                                {new Date(entry.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="py-3 pr-3 text-white">{entry.weight != null ? `${entry.weight} kg` : '—'}</td>
                              <td className="py-3 pr-3 text-[#a0a0a0]">
                                {entry.bodyFat != null ? `${entry.bodyFat}%` : '—'}
                              </td>
                              <td className="max-w-[12rem] truncate py-3 pr-3 text-[#a0a0a0]">
                                {entry.notes || '—'}
                              </td>
                              <td className="py-3 text-right">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={deletingId === entry._id}
                                  onClick={() => handleDeleteProgress(entry._id)}
                                >
                                  {deletingId === entry._id ? '...' : 'Delete'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-generator">
            <AIGeneratorTab />
          </TabsContent>
        </Tabs>
      </div>

      {showLogMeal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0e1210] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Log a Meal</h2>
              <button type="button" onClick={() => setShowLogMeal(false)} className="text-[#a0a0a0] hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={searchFood} className="mb-4 flex gap-2">
              <Input
                value={foodSearch}
                onChange={(event) => setFoodSearch(event.target.value)}
                placeholder="Search chicken, daal, roti..."
              />
              <Button type="submit" disabled={searchingFood} className="bg-primary text-black hover:brightness-95">
                {searchingFood ? '...' : 'Search'}
              </Button>
            </form>
            {foodResults.length > 0 && (
              <div className="mb-4 grid max-h-48 gap-2 overflow-y-auto">
                {foodResults.map((food) => (
                  <button
                    key={`${food.name}-${food.per}`}
                    type="button"
                    onClick={() => setSelectedFood(food)}
                    className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-left hover:border-primary/50"
                  >
                    <div className="font-medium text-white">{food.name}</div>
                    <div className="text-xs text-[#a0a0a0]">
                      {food.calories} kcal · {food.protein}g protein · {food.per}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedFood && (
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="font-medium text-white">{selectedFood.name}</p>
                <div>
                  <Label htmlFor="meal-type">Meal</Label>
                  <select
                    id="meal-type"
                    value={mealType}
                    onChange={(event) => setMealType(event.target.value)}
                    className="mt-1 w-full select-native"
                  >
                    {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="food-quantity">Quantity (g)</Label>
                  <Input
                    id="food-quantity"
                    type="number"
                    min="1"
                    value={foodQuantity}
                    onChange={(event) => setFoodQuantity(event.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  type="button"
                  onClick={logFood}
                  disabled={loggingMeal}
                  className="w-full bg-primary text-black hover:brightness-95"
                >
                  {loggingMeal ? 'Logging...' : `Log ${selectedFood.name}`}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
