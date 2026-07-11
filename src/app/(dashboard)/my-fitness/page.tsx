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
  const [weightForm, setWeightForm] = useState({ weight: '', bodyFat: '', notes: '' })
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

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/tracking/plans/my-plan').then(r => r.ok ? r.json() : null),
      fetch('/api/tracking/progress').then(r => r.ok ? r.json() : []),
      fetch('/api/tracking/meal-logs/today').then(r => r.ok ? r.json() : { meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } }),
    ]).then(([planData, progressData, mealData]) => {
      if (planData?.plan === null) setPlan(null)
      else if (planData?._id) setPlan(planData)
      setProgress(Array.isArray(progressData) ? progressData : [])
      setMeals(mealData)
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
          notes: weightForm.notes,
          date: new Date(),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Progress logged!')
      setWeightForm({ weight: '', bodyFat: '', notes: '' })
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

      toast.success('Workout completed! Great work.')
      setWorkoutStarted(false)
      setCompletedExercises([])
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
      toast.success('Meal logged')
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
  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center">
      <Link href="/login" className="btn-accent px-8 py-3">Sign in to view fitness</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-8 pb-28 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-2">My Fitness</h1>
        <p className="text-[#a0a0a0] mb-8">Track workouts, nutrition, and progress</p>

        <Tabs defaultValue="overview">
          <TabsList className="bg-[#111] border border-[#1a1a1a] mb-8 w-full justify-start overflow-x-auto">
            {['overview', 'workout', 'nutrition', 'progress'].map(t => (
              <TabsTrigger key={t} value={t} className="capitalize data-active:bg-[#00ff87]/10 data-active:text-[#00ff87]">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            {loading ? <Skeleton className="h-48 bg-[#1a1a1a]" /> : (
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-[#111] border-[#1a1a1a] text-white">
                  <CardHeader><CardTitle className="text-sm text-[#a0a0a0]">Active Plan</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-[#00ff87]">{plan?.title || 'None'}</div>
                    {plan && <p className="text-[#555] text-sm mt-1 capitalize">{plan.difficulty} · {plan.durationWeeks}w</p>}
                  </CardContent>
                </Card>
                <Card className="bg-[#111] border-[#1a1a1a] text-white">
                  <CardHeader><CardTitle className="text-sm text-[#a0a0a0]">Today&apos;s Calories</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-[#00ff87]">{meals?.totals.calories || 0}</div>
                    <p className="text-[#555] text-sm mt-1">kcal logged today</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#111] border-[#1a1a1a] text-white">
                  <CardHeader><CardTitle className="text-sm text-[#a0a0a0]">Latest Weight</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-black text-[#00ff87]">
                      {progress.length ? `${progress[progress.length - 1].weight} kg` : '—'}
                    </div>
                    <p className="text-[#555] text-sm mt-1">{progress.length} records</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="workout">
            {loading ? <Skeleton className="h-64 bg-[#1a1a1a]" /> : plan ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{plan.title}</h2>
                    <p className="text-[#a0a0a0] text-sm capitalize">{plan.goal?.replace('_', ' ')} · {plan.difficulty}</p>
                  </div>
                  <Badge className="bg-[#00ff87]/10 text-[#00ff87]">{plan.status}</Badge>
                </div>
                {todaySchedule && (
                  <Card className="bg-[#111] border-[#1a1a1a] text-white">
                    <CardHeader><CardTitle>Today — {today}</CardTitle></CardHeader>
                    <CardContent>
                      {todaySchedule.isRestDay ? (
                        <p className="text-[#a0a0a0]">Rest day — recover and recharge 💤</p>
                      ) : (
                        <div className="space-y-3">
                          {todaySchedule.exercises?.map((ex, i) => (
                            <div key={i} className="flex items-center justify-between gap-4 p-3 bg-[#0a0a0a] rounded-xl">
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
                                  className="h-4 w-4 accent-[#00ff87]"
                                />
                                <span className={completedExercises.includes(i) ? 'font-medium line-through text-[#555]' : 'font-medium'}>
                                  {ex.name}
                                </span>
                              </label>
                              <span className="text-[#a0a0a0] text-sm">{ex.sets}×{ex.reps} · {ex.restSeconds}s rest</span>
                            </div>
                          ))}
                          <div className="flex gap-3 pt-3">
                            {!workoutStarted ? (
                              <Button
                                onClick={() => setWorkoutStarted(true)}
                                className="bg-[#00ff87] text-black hover:bg-[#00cc6a]"
                              >
                                Start Workout
                              </Button>
                            ) : (
                              <>
                                <Button
                                  onClick={handleCompleteWorkout}
                                  disabled={completingWorkout}
                                  className="bg-[#00ff87] text-black hover:bg-[#00cc6a]"
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
                    <Card key={day.day} className="bg-[#111] border-[#1a1a1a] text-white">
                      <CardHeader><CardTitle className="text-base">{day.day}</CardTitle></CardHeader>
                      <CardContent>
                        {day.isRestDay ? (
                          <p className="text-[#555] text-sm">Rest Day</p>
                        ) : (
                          <ul className="space-y-1">
                            {day.exercises?.map((ex, i) => (
                              <li key={i} className="text-[#a0a0a0] text-sm">{ex.name} — {ex.sets}×{ex.reps}</li>
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
                <p className="text-[#a0a0a0] mb-4">No workout plan assigned yet</p>
                <Link href="/coaching" className="btn-accent px-6 py-2">Find a Trainer</Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="nutrition">
            {loading ? <Skeleton className="h-48 bg-[#1a1a1a]" /> : (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Calories', value: meals?.totals.calories, color: '#00ff87' },
                    { label: 'Protein', value: `${Math.round(meals?.totals.protein || 0)}g`, color: '#00ff87' },
                    { label: 'Carbs', value: `${Math.round(meals?.totals.carbs || 0)}g`, color: '#00bfff' },
                    { label: 'Fat', value: `${Math.round(meals?.totals.fat || 0)}g`, color: '#ff6b6b' },
                  ].map(m => (
                    <Card key={m.label} className="bg-[#111] border-[#1a1a1a] text-white text-center">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-black" style={{ color: m.color }}>{m.value}</div>
                        <div className="text-[#555] text-xs mt-1">{m.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="bg-[#111] border-[#1a1a1a] text-white">
                  <CardHeader><CardTitle>Search & Log Food</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={searchFood} className="flex gap-2">
                      <Input
                        value={foodSearch}
                        onChange={(event) => setFoodSearch(event.target.value)}
                        placeholder="Search chicken, daal, roti..."
                        className="bg-[#0a0a0a] border-[#2a2a2a]"
                      />
                      <Button type="submit" disabled={searchingFood} className="bg-[#00ff87] text-black hover:bg-[#00cc6a]">
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
                            className="rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-3 text-left hover:border-[#00ff87]/50"
                          >
                            <div className="font-medium">{food.name}</div>
                            <div className="text-xs text-[#a0a0a0]">
                              {food.calories} kcal · {food.protein}g protein · {food.per}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedFood && (
                      <div className="grid gap-3 rounded-xl border border-[#00ff87]/20 bg-[#00ff87]/5 p-4 sm:grid-cols-3">
                        <div>
                          <Label htmlFor="meal-type">Meal</Label>
                          <select
                            id="meal-type"
                            value={mealType}
                            onChange={(event) => setMealType(event.target.value)}
                            className="mt-1 h-9 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-2 text-sm"
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
                            className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            onClick={logFood}
                            disabled={loggingMeal}
                            className="w-full bg-[#00ff87] text-black hover:bg-[#00cc6a]"
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
                      <Card key={m._id} className="bg-[#111] border-[#1a1a1a] text-white">
                        <CardContent className="pt-4 flex justify-between items-center">
                          <div>
                            <span className="font-medium capitalize">{m.mealType}</span>
                            <p className="text-[#555] text-sm">{m.foods?.map(f => f.name).join(', ')}</p>
                          </div>
                          <span className="text-[#00ff87] font-bold">{m.totalCalories} kcal</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#a0a0a0] text-center py-8">No meals logged today</p>
                )}
                <Link href="/nutrition" className="text-[#00ff87] text-sm hover:underline">Browse recipes and full nutrition tools →</Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="bg-[#111] border-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Weight Trend</CardTitle></CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis dataKey="date" stroke="#555" fontSize={12} />
                        <YAxis stroke="#555" fontSize={12} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8 }} />
                        <Line type="monotone" dataKey="weight" stroke="#00ff87" strokeWidth={2} dot={{ fill: '#00ff87' }} />
                        <Line type="monotone" dataKey="bodyFat" stroke="#00bfff" strokeWidth={2} dot={{ fill: '#00bfff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-[#a0a0a0] text-center py-12">No progress data yet. Log your first entry below.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-[#111] border-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Log Progress</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleAddProgress} className="space-y-4">
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input id="weight" type="number" step="0.1" value={weightForm.weight}
                        onChange={e => setWeightForm(f => ({ ...f, weight: e.target.value }))}
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                    </div>
                    <div>
                      <Label htmlFor="bodyFat">Body Fat % (optional)</Label>
                      <Input id="bodyFat" type="number" step="0.1" value={weightForm.bodyFat}
                        onChange={e => setWeightForm(f => ({ ...f, bodyFat: e.target.value }))}
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input id="notes" value={weightForm.notes}
                        onChange={e => setWeightForm(f => ({ ...f, notes: e.target.value }))}
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                    </div>
                    <Button type="submit" disabled={saving} className="bg-[#00ff87] text-black hover:bg-[#00cc6a] w-full">
                      {saving ? 'Saving...' : 'Save Progress'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-8 bg-[#111] border-[#1a1a1a] text-white">
              <CardHeader><CardTitle>Recent Entries</CardTitle></CardHeader>
              <CardContent>
                {progress.length === 0 ? (
                  <p className="text-sm text-[#a0a0a0]">No entries yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2a2a2a] text-left text-[#a0a0a0]">
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Weight</th>
                          <th className="pb-2">Body Fat</th>
                          <th className="pb-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...progress].slice(-5).reverse().map((record) => (
                          <tr key={record._id} className="border-b border-[#1a1a1a]">
                            <td className="py-3">{new Date(record.date).toLocaleDateString()}</td>
                            <td className="py-3">{record.weight ? `${record.weight} kg` : '—'}</td>
                            <td className="py-3">{record.bodyFat ? `${record.bodyFat}%` : '—'}</td>
                            <td className="py-3 text-[#a0a0a0]">{record.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00ff87] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
