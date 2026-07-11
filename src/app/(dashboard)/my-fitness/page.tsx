'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { WorkoutPlan, ProgressRecord, MealLog } from '@/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartTheme } from '@/lib/chart-theme'
import { PageLoader } from '@/components/shared/PageLoader'
import { SignInGate } from '@/components/shared/AccessGate'
import { FadeIn, StaggerChildren, CountUp } from '@/components/motion'
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeaderCell, DataTableRow } from '@/components/shared/DataTable'
import { GamificationStats } from '@/components/gamification/GamificationStats'
import type { GamificationMeResponse } from '@/lib/gamification'

interface FoodResult {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  per: string
}

export default function MyFitnessPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [progress, setProgress] = useState<ProgressRecord[]>([])
  const [meals, setMeals] = useState<{ meals: MealLog[]; totals: { calories: number; protein: number; carbs: number; fat: number } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [weightForm, setWeightForm] = useState({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', notes: '' })
  const [workoutHistory, setWorkoutHistory] = useState<{
    logs: Array<{ _id: string; date: string; durationMinutes?: number; exercises?: Array<{ name: string }>; plan?: { title?: string } }>
    streak: number
    totalCompleted: number
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [workoutStarted, setWorkoutStarted] = useState(false)
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

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/tracking/plans/my-plan').then(r => r.ok ? r.json() : null),
      fetch('/api/tracking/progress').then(r => r.ok ? r.json() : []),
      fetch('/api/tracking/meal-logs/today').then(r => r.ok ? r.json() : { meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } }),
      fetch('/api/tracking/logs?limit=10').then(r => r.ok ? r.json() : { logs: [], streak: 0, totalCompleted: 0 }),
      fetch('/api/gamification/me').then(r => r.ok ? r.json() : null),
    ]).then(([planData, progressData, mealData, historyData, gamificationData]) => {
      if (planData?.plan === null) setPlan(null)
      else if (planData?._id) setPlan(planData)
      setProgress(Array.isArray(progressData) ? progressData : [])
      setMeals(mealData)
      setWorkoutHistory(historyData)
      if (gamificationData?.xp !== undefined) setGamification(gamificationData)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { if (user) loadData() }, [user])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todaySchedule = plan?.weeklySchedule?.find(d => d.day.toLowerCase() === today.toLowerCase())

  const chartData = progress.map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: r.weight,
    bodyFat: r.bodyFat,
  }))

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!weightForm.weight) return toast.error('Weight is required')
    setSaving(true)
    try {
      const res = await fetch('/api/tracking/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: parseFloat(weightForm.weight),
          bodyFat: weightForm.bodyFat ? parseFloat(weightForm.bodyFat) : undefined,
          chest: weightForm.chest ? parseFloat(weightForm.chest) : undefined,
          waist: weightForm.waist ? parseFloat(weightForm.waist) : undefined,
          hips: weightForm.hips ? parseFloat(weightForm.hips) : undefined,
          notes: weightForm.notes,
          date: new Date(),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Progress logged!')
      setWeightForm({ weight: '', bodyFat: '', chest: '', waist: '', hips: '', notes: '' })
      loadData()
    } catch {
      toast.error('Failed to save progress')
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteWorkout = async () => {
    if (!plan || !todaySchedule || todaySchedule.isRestDay) return
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
      const res = await fetch(`/api/tracking/logs/${plan._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercises }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      const xpMsg = data.xpAwarded ? ` +${data.xpAwarded} XP` : ''
      toast.success(`Workout completed! Great work.${xpMsg}`)
      setWorkoutStarted(false)
      setCompletedExercises([])
      loadData()
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
          foods: [{
            name: selectedFood.name,
            calories: Math.round(selectedFood.calories * ratio),
            protein: Math.round(selectedFood.protein * ratio * 10) / 10,
            carbs: Math.round(selectedFood.carbs * ratio * 10) / 10,
            fat: Math.round(selectedFood.fat * ratio * 10) / 10,
            quantity,
            unit: 'g',
          }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      const xpMsg = data.xpAwarded ? ` +${data.xpAwarded} XP` : ''
      toast.success(`Meal logged${xpMsg}`)
      setSelectedFood(null)
      setFoodResults([])
      setFoodSearch('')
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log meal')
    } finally {
      setLoggingMeal(false)
    }
  }

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to view fitness" />

  return (
    <div className="min-h-screen pt-6 pb-28 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="page-hero mb-6 px-6 py-8 sm:px-8 gym-floor">
            <p className="eyebrow mb-2">Performance Hub</p>
            <h1 className="display-title text-3xl md:text-4xl">Your Fitness, Fully Connected</h1>
            <p className="mt-2 text-muted-foreground">Train with intent, fuel intelligently, and measure every win.</p>
            <p className="workout-label mt-2 text-primary/70">Track · Train · Dominate</p>
          </div>
        </FadeIn>

        <Tabs defaultValue="overview">
          <TabsList className="mb-8 w-full justify-start overflow-x-auto">
            {['overview', 'workout', 'history', 'nutrition', 'progress'].map(t => (
              <TabsTrigger key={t} value={t} className="capitalize">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            {loading ? <Skeleton className="h-48 bg-muted" /> : (
              <>
              <StaggerChildren className="dashboard-grid cols-3 mb-6">
                <Card className="card-athletic interactive-lift">
                  <CardHeader><CardTitle className="workout-label text-muted-foreground">Active Plan</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-primary">{plan?.title || 'None'}</div>
                    {plan && <p className="text-muted-foreground text-sm mt-1 capitalize">{plan.difficulty} · {plan.durationWeeks}w</p>}
                  </CardContent>
                </Card>
                <Card className="card-athletic interactive-lift">
                  <CardHeader><CardTitle className="workout-label text-muted-foreground">Today&apos;s Calories</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-primary">
                      <CountUp value={meals?.totals.calories || 0} />
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">kcal logged today</p>
                  </CardContent>
                </Card>
                <Card className="card-athletic interactive-lift">
                  <CardHeader><CardTitle className="workout-label text-muted-foreground">Workout Streak</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-primary">
                      <CountUp value={workoutHistory?.streak ?? 0} suffix=" days" />
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">{workoutHistory?.totalCompleted ?? 0} total sessions</p>
                  </CardContent>
                </Card>
              </StaggerChildren>
              {!loading && (
                <div className="mt-2">
                  <GamificationStats data={gamification} loading={loading} />
                </div>
              )}
              </>
            )}
          </TabsContent>

          <TabsContent value="workout">
            {loading ? <Skeleton className="h-64 bg-muted" /> : plan ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{plan.title}</h2>
                    <p className="text-muted-foreground text-sm capitalize">{plan.goal?.replace('_', ' ')} · {plan.difficulty}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary">{plan.status}</Badge>
                </div>
                {todaySchedule && (
                  <Card>
                    <CardHeader><CardTitle>Today — {today}</CardTitle></CardHeader>
                    <CardContent>
                      {todaySchedule.isRestDay ? (
                        <p className="text-muted-foreground">Rest day — recover and recharge 💤</p>
                      ) : (
                        <div className="space-y-3">
                          {todaySchedule.exercises?.map((ex, i) => (
                            <div key={i} className="flex items-center justify-between gap-4 p-3 bg-background rounded-xl">
                              <label className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={completedExercises.includes(i)}
                                  disabled={!workoutStarted}
                                  onChange={(event) => setCompletedExercises((current) =>
                                    event.target.checked
                                      ? [...current, i]
                                      : current.filter((index) => index !== i),
                                  )}
                                  className="h-4 w-4 accent-primary"
                                />
                                <span className={completedExercises.includes(i) ? 'font-medium line-through text-muted-foreground' : 'font-medium'}>
                                  {ex.name}
                                </span>
                              </label>
                              <span className="text-muted-foreground text-sm">{ex.sets}×{ex.reps} · {ex.restSeconds}s rest</span>
                            </div>
                          ))}
                          <div className="flex gap-3 pt-3">
                            {!workoutStarted ? (
                              <Button
                                onClick={() => setWorkoutStarted(true)}
                                className="bg-primary text-black hover:brightness-95"
                              >
                                Start Workout
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
                                  onClick={() => {
                                    setWorkoutStarted(false)
                                    setCompletedExercises([])
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plan.weeklySchedule?.map(day => (
                    <Card key={day.day}>
                      <CardHeader><CardTitle className="text-base">{day.day}</CardTitle></CardHeader>
                      <CardContent>
                        {day.isRestDay ? (
                          <p className="text-muted-foreground text-sm">Rest Day</p>
                        ) : (
                          <ul className="space-y-1">
                            {day.exercises?.map((ex, i) => (
                              <li key={i} className="text-muted-foreground text-sm">{ex.name} — {ex.sets}×{ex.reps}</li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">No workout plan assigned yet</p>
                <Link href="/coaching" className="btn-accent px-6 py-2">Find a Trainer</Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {loading ? <Skeleton className="h-48 bg-muted" /> : (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-black text-primary">{workoutHistory?.streak ?? 0}</div>
                      <p className="text-muted-foreground text-sm">Day streak</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-black text-primary">{workoutHistory?.totalCompleted ?? 0}</div>
                      <p className="text-muted-foreground text-sm">Total completed workouts</p>
                    </CardContent>
                  </Card>
                </div>
                {workoutHistory?.logs?.length ? (
                  <div className="space-y-3">
                    {workoutHistory.logs.map(log => (
                      <Card key={log._id}>
                        <CardContent className="pt-4 flex justify-between items-start gap-4">
                          <div>
                            <div className="font-medium">{log.plan?.title || 'Workout Session'}</div>
                            <p className="text-muted-foreground text-sm mt-1">
                              {log.exercises?.map(e => e.name).join(', ') || 'Exercises logged'}
                            </p>
                            {log.durationMinutes ? (
                              <p className="text-xs text-muted-foreground mt-1">{log.durationMinutes} min</p>
                            ) : null}
                          </div>
                          <span className="text-primary text-sm font-medium whitespace-nowrap">
                            {new Date(log.date).toLocaleDateString()}
                          </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-12">No completed workouts yet. Finish a session in the Workout tab.</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="nutrition">
            {loading ? <Skeleton className="h-48 bg-muted" /> : (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Calories', value: meals?.totals.calories, color: 'var(--primary)' },
                    { label: 'Protein', value: `${Math.round(meals?.totals.protein || 0)}g`, color: 'var(--primary)' },
                    { label: 'Carbs', value: `${Math.round(meals?.totals.carbs || 0)}g`, color: chartTheme.secondary },
                    { label: 'Fat', value: `${Math.round(meals?.totals.fat || 0)}g`, color: 'var(--destructive)' },
                  ].map(m => (
                    <Card key={m.label} className="bg-card/60 border-border text-white text-center">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-black" style={{ color: m.color }}>{m.value}</div>
                        <div className="text-muted-foreground text-xs mt-1">{m.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardHeader><CardTitle>Search & Log Food</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={searchFood} className="flex gap-2">
                      <Input
                        value={foodSearch}
                        onChange={(event) => setFoodSearch(event.target.value)}
                        placeholder="Search chicken, daal, roti..."
                        className="bg-background border-border"
                      />
                      <Button type="submit" disabled={searchingFood} className="bg-primary text-black hover:brightness-95">
                        {searchingFood ? 'Searching...' : 'Search'}
                      </Button>
                    </form>
                    {foodResults.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {foodResults.map((food) => (
                          <button
                            key={`${food.name}-${food.per}`}
                            type="button"
                            onClick={() => setSelectedFood(food)}
                            className="rounded-xl border border-border bg-background p-3 text-left hover:border-primary/50"
                          >
                            <div className="font-medium">{food.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {food.calories} kcal · {food.protein}g protein · {food.per}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedFood && (
                      <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:grid-cols-3">
                        <div>
                          <Label htmlFor="meal-type">Meal</Label>
                          <select
                            id="meal-type"
                            value={mealType}
                            onChange={(event) => setMealType(event.target.value)}
                            className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                          >
                            {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                              <option key={type} value={type}>{type}</option>
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
                            className="mt-1 bg-background border-border"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            onClick={logFood}
                            disabled={loggingMeal}
                            className="w-full bg-primary text-black hover:brightness-95"
                          >
                            {loggingMeal ? 'Logging...' : `Log ${selectedFood.name}`}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                {meals?.meals?.length ? (
                  <div className="space-y-3">
                    {meals.meals.map(m => (
                      <Card key={m._id}>
                        <CardContent className="pt-4 flex justify-between items-center">
                          <div>
                            <span className="font-medium capitalize">{m.mealType}</span>
                            <p className="text-muted-foreground text-sm">{m.foods?.map(f => f.name).join(', ')}</p>
                          </div>
                          <span className="text-primary font-bold">{m.totalCalories} kcal</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No meals logged today</p>
                )}
                <Link href="/nutrition" className="text-primary text-sm hover:underline">Browse recipes and full nutrition tools →</Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader><CardTitle>Weight Trend</CardTitle></CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={12} />
                        <YAxis stroke={chartTheme.axis} fontSize={12} />
                        <Tooltip contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: chartTheme.tooltip.borderRadius }} />
                        <Line type="monotone" dataKey="weight" stroke={chartTheme.primary} strokeWidth={2} dot={{ fill: chartTheme.primary }} />
                        <Line type="monotone" dataKey="bodyFat" stroke={chartTheme.secondary} strokeWidth={2} dot={{ fill: chartTheme.secondary }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-12">No progress data yet. Log your first entry below.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Log Progress</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleAddProgress} className="space-y-4">
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input id="weight" type="number" step="0.1" value={weightForm.weight}
                        onChange={e => setWeightForm(f => ({ ...f, weight: e.target.value }))}
                        className="mt-1 bg-background border-border" />
                    </div>
                    <div>
                      <Label htmlFor="bodyFat">Body Fat % (optional)</Label>
                      <Input id="bodyFat" type="number" step="0.1" value={weightForm.bodyFat}
                        onChange={e => setWeightForm(f => ({ ...f, bodyFat: e.target.value }))}
                        className="mt-1 bg-background border-border" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="chest">Chest (cm)</Label>
                        <Input id="chest" type="number" step="0.1" value={weightForm.chest}
                          onChange={e => setWeightForm(f => ({ ...f, chest: e.target.value }))}
                          className="mt-1 bg-background border-border" />
                      </div>
                      <div>
                        <Label htmlFor="waist">Waist (cm)</Label>
                        <Input id="waist" type="number" step="0.1" value={weightForm.waist}
                          onChange={e => setWeightForm(f => ({ ...f, waist: e.target.value }))}
                          className="mt-1 bg-background border-border" />
                      </div>
                      <div>
                        <Label htmlFor="hips">Hips (cm)</Label>
                        <Input id="hips" type="number" step="0.1" value={weightForm.hips}
                          onChange={e => setWeightForm(f => ({ ...f, hips: e.target.value }))}
                          className="mt-1 bg-background border-border" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input id="notes" value={weightForm.notes}
                        onChange={e => setWeightForm(f => ({ ...f, notes: e.target.value }))}
                        className="mt-1 bg-background border-border" />
                    </div>
                    <Button type="submit" disabled={saving} className="bg-primary text-black hover:brightness-95 w-full">
                      {saving ? 'Saving...' : 'Save Progress'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-8 bg-card/60 border-border text-white">
              <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
              <CardContent>
                {progress.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No entries yet.</p>
                ) : (
                  <DataTable>
                    <DataTableHead>
                      <DataTableHeaderCell>Date</DataTableHeaderCell>
                      <DataTableHeaderCell>Weight</DataTableHeaderCell>
                      <DataTableHeaderCell>Body Fat</DataTableHeaderCell>
                      <DataTableHeaderCell>Chest</DataTableHeaderCell>
                      <DataTableHeaderCell>Waist</DataTableHeaderCell>
                      <DataTableHeaderCell>Hips</DataTableHeaderCell>
                      <DataTableHeaderCell>Notes</DataTableHeaderCell>
                    </DataTableHead>
                    <DataTableBody>
                      {[...progress].slice(-5).reverse().map((record) => (
                        <DataTableRow key={record._id}>
                          <DataTableCell>{new Date(record.date).toLocaleDateString()}</DataTableCell>
                          <DataTableCell>{record.weight ? `${record.weight} kg` : '—'}</DataTableCell>
                          <DataTableCell>{record.bodyFat ? `${record.bodyFat}%` : '—'}</DataTableCell>
                          <DataTableCell>{record.chest ? `${record.chest} cm` : '—'}</DataTableCell>
                          <DataTableCell>{record.waist ? `${record.waist} cm` : '—'}</DataTableCell>
                          <DataTableCell>{record.hips ? `${record.hips} cm` : '—'}</DataTableCell>
                          <DataTableCell className="text-muted-foreground">{record.notes || '—'}</DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

