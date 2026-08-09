'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Salad, ClipboardList, UtensilsCrossed, ChevronDown, ChevronUp, Globe, Trash2 } from 'lucide-react'
import { SectionHeading } from '@/components/shared/SectionHeading'
import { CatalogImageFrame } from '@/components/shared/CatalogImageFrame'
import { ExpandableCardPanel } from '@/components/shared/ExpandableCardPanel'
import { DishMoreInfoPanel } from '@/components/nutrition/DishMoreInfoPanel'
import { mealDetailPath } from '@/lib/meal-slug'
import { FadeIn, CountUp } from '@/components/motion'
import { calculateDailyCalories } from '@/lib/nutrition'

interface MealSummary {
  id: string
  name: string
  category: string
  area: string
  thumb: string
  tags?: string
}

interface MealDetail extends MealSummary {
  instructions: string
  ingredients: { name: string; measure: string }[]
  youtube?: string
}

interface FoodResult {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  per: string
}

interface MealEntry {
  _id: string
  mealType: string
  foods: { name: string; calories: number; protein: number; carbs: number; fat: number }[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  date: string
}

interface DailyTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

export default function NutritionPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([])
  const [totals, setTotals] = useState<DailyTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryLoaded, setSummaryLoaded] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<FoodResult[]>([])
  const [loggingFood, setLoggingFood] = useState<FoodResult | null>(null)
  const [logMealType, setLogMealType] = useState('breakfast')
  const [logQuantity, setLogQuantity] = useState('100')
  const [submittingLog, setSubmittingLog] = useState(false)
  const [calorieGoal, setCalorieGoal] = useState(2000)
  const [recipeMeals, setRecipeMeals] = useState<MealSummary[]>([])
  const [mealsLoading, setMealsLoading] = useState(true)
  const [mealsLoadingMore, setMealsLoadingMore] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [mealDetails, setMealDetails] = useState<Record<string, MealDetail>>({})
  const [mealCategory, setMealCategory] = useState('All')
  const [mealArea, setMealArea] = useState('All')
  const [mealSearch, setMealSearch] = useState('')
  const [debouncedMealSearch, setDebouncedMealSearch] = useState('')
  const [mealLetter, setMealLetter] = useState('All')
  const [mealCategories, setMealCategories] = useState<string[]>([])
  const [mealAreas, setMealAreas] = useState<string[]>([])
  const [mealTotal, setMealTotal] = useState(0)
  const [mealCatalogTotal, setMealCatalogTotal] = useState(0)
  const [mealPage, setMealPage] = useState(1)
  const [mealTotalPages, setMealTotalPages] = useState(1)
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null)

  const fetchTodayMeals = useCallback(async () => {
    if (!user) return
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    setSummaryLoading(true)

    try {
      const res = await fetch('/api/tracking/meal-logs/today', {
        credentials: 'include',
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        setTodayMeals(data.meals || [])
        setTotals(data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 })
      } else {
        setTodayMeals([])
        setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 })
      }
    } catch {
      setTodayMeals([])
      setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 })
    } finally {
      clearTimeout(timeout)
      setSummaryLoading(false)
      setSummaryLoaded(true)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && user) fetchTodayMeals()
    if (!authLoading && !user) setSummaryLoaded(true)
  }, [authLoading, user, fetchTodayMeals])

  useEffect(() => {
    if (!user) return
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const u = data?.user
        if (u?.calorieGoal) {
          setCalorieGoal(u.calorieGoal)
        } else {
          setCalorieGoal(calculateDailyCalories({
            currentWeight: u?.currentWeight,
            targetWeight: u?.targetWeight,
            fitnessGoal: u?.fitnessGoal,
            activityLevel: u?.activityLevel,
          }))
        }
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedMealSearch(mealSearch), 300)
    return () => clearTimeout(t)
  }, [mealSearch])

  const buildMealQuery = useCallback((pageNum: number) => {
    const params = new URLSearchParams({ page: String(pageNum), limit: '24' })
    if (debouncedMealSearch) params.set('search', debouncedMealSearch)
    if (mealCategory !== 'All') params.set('category', mealCategory)
    if (mealArea !== 'All') params.set('area', mealArea)
    if (mealLetter !== 'All') params.set('letter', mealLetter)
    return params.toString()
  }, [debouncedMealSearch, mealCategory, mealArea, mealLetter])

  useEffect(() => {
    const controller = new AbortController()
    setMealsLoading(true)
    setMealPage(1)

    fetch(`/api/meals?meta=true&${buildMealQuery(1)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { meals: [] }))
      .then((data) => {
        setRecipeMeals(data.meals || [])
        setMealTotal(data.total ?? 0)
        setMealTotalPages(data.totalPages ?? 1)
        setMealPage(data.page ?? 1)
        if (data.meta) {
          setMealCategories(data.meta.categories || [])
          setMealAreas(data.meta.areas || [])
          setMealCatalogTotal(data.meta.total ?? 0)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setRecipeMeals([])
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setMealsLoading(false)
          // #region agent log
          fetch('http://127.0.0.1:7893/ingest/3b5841b0-46ed-4652-9b9f-279e38a5ba27',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1483ff'},body:JSON.stringify({sessionId:'1483ff',hypothesisId:'H3',location:'nutrition/page.tsx:fetch',message:'meals loaded',data:{},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
        }
      })

    return () => controller.abort()
  }, [buildMealQuery])

  const loadMoreMeals = async () => {
    if (mealsLoading || mealsLoadingMore) return
    const nextPage = mealPage + 1
    if (nextPage > mealTotalPages) return
    setMealsLoadingMore(true)
    try {
      const res = await fetch(`/api/meals?${buildMealQuery(nextPage)}`)
      if (res.ok) {
        const data = await res.json()
        const incoming = data.meals || []
        if (incoming.length > 0) {
          setRecipeMeals((prev) => [...prev, ...incoming])
          setMealPage(data.page ?? nextPage)
        }
      }
    } finally {
      setMealsLoadingMore(false)
    }
  }

  const clearMealFilters = () => {
    setMealCategory('All')
    setMealArea('All')
    setMealSearch('')
    setMealLetter('All')
  }

  const hasMealFilters = mealCategory !== 'All' || mealArea !== 'All' || debouncedMealSearch || mealLetter !== 'All'

  const loadMealDetail = async (id: string) => {
    if (mealDetails[id]) return
    const res = await fetch(`/api/meals?id=${id}`)
    if (res.ok) {
      const detail = await res.json()
      setMealDetails((prev) => ({ ...prev, [id]: detail }))
    }
  }

  const toggleMeal = async (id: string) => {
    if (expandedMeal === id) {
      setExpandedMeal(null)
      return
    }
    setExpandedMeal(id)
    await loadMealDetail(id)
  }

  const handleSearch = async () => {
    const query = searchQuery.trim()
    if (!query) return
    if (!user) {
      toast.error('Sign in to search foods')
      return
    }

    setSearching(true)
    setSearchResults([])
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    try {
      const res = await fetch(`/api/nutrition/analyze?query=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
      const data = await res.json()
      if (data.results?.length > 0) {
        setSearchResults(data.results)
      } else {
        setSearchResults([])
        toast.error('No results found')
      }
    } catch {
      toast.error('Search failed. Try again.')
      setSearchResults([])
    } finally {
      clearTimeout(timeout)
      setSearching(false)
    }
  }

  const scaleFood = (item: FoodResult, grams: number) => {
    const ratio = grams / 100
    return {
      name: item.name,
      calories: Math.round(item.calories * ratio),
      protein: Math.round(item.protein * ratio * 10) / 10,
      carbs: Math.round(item.carbs * ratio * 10) / 10,
      fat: Math.round(item.fat * ratio * 10) / 10,
      quantity: grams,
      unit: 'g',
    }
  }

  const handleLogMeal = async (item: FoodResult) => {
    const grams = parseFloat(logQuantity)
    if (!grams || grams <= 0) {
      toast.error('Enter a valid quantity in grams')
      return
    }

    setSubmittingLog(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    try {
      const res = await fetch('/api/tracking/meal-logs/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mealType: logMealType,
          foods: [scaleFood(item, grams)],
        }),
        signal: controller.signal,
      })
      if (res.ok) {
        toast.success('Meal logged!')
        setLoggingFood(null)
        setSearchQuery('')
        setSearchResults([])
        fetchTodayMeals()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Failed to log meal')
      }
    } catch {
      toast.error('Failed to log meal')
    } finally {
      clearTimeout(timeout)
      setSubmittingLog(false)
    }
  }

  const handleDeleteMeal = async (mealId: string) => {
    if (!user || deletingMealId) return
    setDeletingMealId(mealId)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    try {
      const res = await fetch(`/api/tracking/meal-logs/today/${mealId}`, {
        method: 'DELETE',
        credentials: 'include',
        signal: controller.signal,
      })
      if (res.ok) {
        toast.success('Meal deleted')
        await fetchTodayMeals()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message || 'Failed to delete meal')
      }
    } catch {
      toast.error('Failed to delete meal')
    } finally {
      clearTimeout(timeout)
      setDeletingMealId(null)
    }
  }

  const calorieProgress = Math.min(100, Math.round((totals.calories / calorieGoal) * 100))
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen pt-8 pb-28 px-4 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <FadeIn>
          <div className="page-hero px-6 py-10 sm:px-10 md:py-14 gym-floor">
            <span className="eyebrow">Nutrition Intelligence</span>
            <h1 className="display-title text-4xl md:text-6xl text-foreground mt-3">Fuel Every Ambition</h1>
            <p className="mt-3 text-muted-foreground">Track meals, understand your macros, and stay aligned with your goals · {todayLabel}</p>
            <p className="workout-label mt-3 text-primary/70">Macros · Meals · Momentum</p>
          </div>
        </FadeIn>

        <section>
          <SectionHeading title="Daily Summary" />

          {authLoading || (user && summaryLoading) ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="glass rounded-2xl p-5 skeleton h-24" />)}
            </div>
          ) : !user ? (
            <div className="glass rounded-2xl p-8 text-center card-athletic">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.08] text-primary">
                <Salad className="size-7" />
              </div>
              <p className="text-foreground font-semibold mb-2">Sign in to track nutrition</p>
              <p className="text-muted-foreground text-sm mb-6">Log meals, monitor macros, and hit your daily goals.</p>
              <Link href="/login" className="btn-accent px-6 py-3 text-sm">Sign In</Link>
            </div>
          ) : summaryLoaded && todayMeals.length === 0 ? (
            <div className="space-y-4">
              <div className="glass rounded-2xl p-8 text-center card-athletic">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/[.08] text-primary">
                  <ClipboardList className="size-6" />
                </div>
                <p className="text-foreground font-medium">No meals logged today</p>
                <p className="text-muted-foreground text-sm mt-1">Search for a food below and log your first meal.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Calories', value: 0, color: 'text-primary' },
                  { label: 'Protein', value: '0g', color: 'text-red-400' },
                  { label: 'Carbs', value: '0g', color: 'text-blue-400' },
                  { label: 'Fat', value: '0g', color: 'text-yellow-400' },
                ].map(m => (
                  <div key={m.label} className="glass rounded-2xl p-5">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">{m.label}</p>
                    <p className={`text-2xl font-black mt-1 ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass rounded-2xl p-5 border border-primary/20 card-athletic interactive-lift">
                  <p className="workout-label text-muted-foreground">Calories</p>
                  <p className="text-2xl font-black text-primary mt-1">
                    <CountUp value={Math.round(totals.calories)} />
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">/ {calorieGoal} goal</p>
                </div>
                <div className="glass rounded-2xl p-5 card-athletic interactive-lift">
                  <p className="workout-label text-muted-foreground">Protein</p>
                  <p className="text-2xl font-black text-red-400 mt-1">
                    <CountUp value={Math.round(totals.protein)} suffix="g" />
                  </p>
                </div>
                <div className="glass rounded-2xl p-5 card-athletic interactive-lift">
                  <p className="workout-label text-muted-foreground">Carbs</p>
                  <p className="text-2xl font-black text-blue-400 mt-1">
                    <CountUp value={Math.round(totals.carbs)} suffix="g" />
                  </p>
                </div>
                <div className="glass rounded-2xl p-5 card-athletic interactive-lift">
                  <p className="workout-label text-muted-foreground">Fat</p>
                  <p className="text-2xl font-black text-yellow-400 mt-1">
                    <CountUp value={Math.round(totals.fat)} suffix="g" />
                  </p>
                </div>
              </div>

              <div className="glass rounded-2xl p-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Calorie progress</span>
                  <span className="text-foreground font-medium">{Math.round(totals.calories)} / {calorieGoal} cal</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-sky-400 rounded-full transition-all duration-500"
                    style={{ width: `${calorieProgress}%` }} />
                </div>
                <p className="text-muted-foreground text-xs mt-2">{calorieProgress}% of daily goal</p>
              </div>
            </div>
          )}
        </section>

        <section>
          <SectionHeading title="Food Search" description="Search Pakistani and international foods to log meals" />
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex gap-3">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder='e.g. "chicken biryani" or "roti"'
                className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:border-primary"
              />
              <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
                className="btn-accent px-6 py-3 text-sm font-bold disabled:opacity-50">
                {searching ? (
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin inline-block" />
                ) : 'Search'}
              </button>
            </div>

            {!user && !authLoading && (
              <p className="text-muted-foreground text-sm text-center py-2">Sign in to search and log foods</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((item, idx) => (
                  <div key={idx} className="glass rounded-xl p-4 border border-border">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-semibold capitalize">{item.name}</p>
                        <p className="text-muted-foreground text-sm mt-1">{item.calories} cal per {item.per}</p>
                        <p className="text-muted-foreground text-xs mt-1">P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g</p>
                      </div>
                      <button
                        onClick={() => { setLoggingFood(loggingFood?.name === item.name ? null : item); setLogQuantity('100') }}
                        className="text-xs px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 font-medium shrink-0">
                        Log This
                      </button>
                    </div>

                    {loggingFood?.name === item.name && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-muted-foreground text-xs block mb-1">Meal type</label>
                            <select value={logMealType} onChange={e => setLogMealType(e.target.value)}
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary">
                              {MEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-muted-foreground text-xs block mb-1">Quantity (g)</label>
                            <input type="number" min="1" value={logQuantity} onChange={e => setLogQuantity(e.target.value)}
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
                          </div>
                        </div>
                        <button onClick={() => handleLogMeal(item)} disabled={submittingLog}
                          className="w-full btn-accent py-2.5 text-sm font-bold disabled:opacity-50">
                          {submittingLog ? 'Logging...' : 'Confirm & Log'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {user && todayMeals.length > 0 && (
          <section>
            <SectionHeading title="Today's Meals" />
            <div className="space-y-6">
              {MEAL_TYPES.map(({ value, label }) => {
                const mealsForType = todayMeals.filter(
                  (meal) => meal.mealType.toLowerCase() === value,
                )
                if (mealsForType.length === 0) return null
                return (
                  <div key={value} className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{label}</h3>
                    {mealsForType.map((meal) => (
                      <div key={meal._id} className="glass rounded-xl p-4 border border-border">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <p className="text-primary text-xs font-semibold uppercase">{label}</p>
                          <button
                            type="button"
                            onClick={() => void handleDeleteMeal(meal._id)}
                            disabled={deletingMealId === meal._id}
                            aria-label={`Delete ${label} meal`}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
                            {deletingMealId === meal._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                        {meal.foods.map((food, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-foreground">{food.name}</span>
                            <span className="text-primary font-medium">{Math.round(food.calories)} cal</span>
                          </div>
                        ))}
                        <p className="text-muted-foreground text-xs mt-2">
                          P: {Math.round(meal.totalProtein)}g · C: {Math.round(meal.totalCarbs)}g · F: {Math.round(meal.totalFat)}g
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section>
          <SectionHeading
            title="Meal Inspiration"
            description={
              mealCatalogTotal > 0
                ? `${mealCatalogTotal}+ real recipes from TheMealDB — filter by category, cuisine, or search by name`
                : 'Real recipes from TheMealDB — images, ingredients, and instructions'
            }
          />

          <div className="glass rounded-2xl p-4 sm:p-5 mb-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {!mealsLoading && (
                <span className="ml-auto">
                  Showing <span className="text-primary font-semibold">{mealTotal.toLocaleString()}</span>
                  {mealCatalogTotal > 0 && <> of {mealCatalogTotal.toLocaleString()} meals</>}
                </span>
              )}
            </div>

            <input
              value={mealSearch}
              onChange={(e) => setMealSearch(e.target.value)}
              placeholder="Search recipes by name..."
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:border-primary"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Category</span>
                <select
                  value={mealCategory}
                  onChange={(e) => setMealCategory(e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="All">All categories</option>
                  {mealCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cuisine / Area</span>
                <select
                  value={mealArea}
                  onChange={(e) => setMealArea(e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="All">All cuisines</option>
                  {mealAreas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setMealLetter('All')}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  mealLetter === 'All' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                All
              </button>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
                <button
                  key={letter}
                  onClick={() => setMealLetter(letter)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    mealLetter === letter ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/25'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>

            {hasMealFilters && (
              <button onClick={clearMealFilters} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                Clear recipe filters
              </button>
            )}
          </div>

          {mealsLoading ? (
            <div className="dashboard-grid cols-3">
              {[...Array(6)].map((_, i) => <div key={i} className="glass skeleton h-72 rounded-2xl" />)}
            </div>
          ) : recipeMeals.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <UtensilsCrossed className="size-8 mx-auto mb-3 text-primary/50" />
              <p className="text-foreground font-medium">No recipes match your filters</p>
              <p className="text-muted-foreground text-sm mt-1">Try a different category, cuisine, or search term.</p>
            </div>
          ) : (
            <>
              <div className="dashboard-grid cols-3">
                {recipeMeals.map((recipe) => {
                  const detail = mealDetails[recipe.id]
                  const isOpen = expandedMeal === recipe.id
                  return (
                    <div key={recipe.id} className="glass interactive-lift card-athletic flex h-full flex-col overflow-hidden rounded-2xl">
                      <Link href={mealDetailPath(recipe.name, recipe.id)} className="block">
                        <CatalogImageFrame
                          src={recipe.thumb}
                          alt={recipe.name}
                          variant="card"
                          fit="contain"
                          fallback={
                            <div className="flex h-full items-center justify-center text-primary/50">
                              <UtensilsCrossed className="size-8" />
                            </div>
                          }
                          badge={
                            <span className="absolute left-3 top-3 rounded-full border border-border bg-background/85 px-2 py-0.5 text-[10px] font-bold text-foreground backdrop-blur">
                              {recipe.category}
                            </span>
                          }
                        />
                      </Link>
                      <div className="flex flex-1 flex-col p-5">
                        <Link href={mealDetailPath(recipe.name, recipe.id)} className="text-foreground font-semibold leading-tight hover:text-primary transition-colors">
                          {recipe.name}
                        </Link>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Globe className="size-3" /> {recipe.area}
                        </div>
                        <Link
                          href={mealDetailPath(recipe.name, recipe.id)}
                          className="mt-2 text-xs font-medium text-primary hover:text-primary/80"
                        >
                          View full recipe →
                        </Link>
                        <button
                          onClick={() => void toggleMeal(recipe.id)}
                          className={`mt-3 flex items-center gap-1 text-xs font-medium transition-colors ${
                            isOpen
                              ? 'text-primary drop-shadow-[0_0_8px_rgba(34,245,154,0.35)]'
                              : 'text-primary hover:text-primary/80'
                          }`}
                        >
                          {isOpen ? <><ChevronUp className="size-3" /> Hide preview</> : <><ChevronDown className="size-3" /> Quick preview</>}
                        </button>
                        {isOpen && (
                          <ExpandableCardPanel loading={!detail} variant="nutrition">
                            {detail && (
                              <DishMoreInfoPanel
                                dish={{
                                  id: detail.id,
                                  name: detail.name,
                                  category: detail.category,
                                  area: detail.area,
                                  thumb: detail.thumb,
                                  ingredients: detail.ingredients,
                                  instructions: detail.instructions,
                                }}
                              />
                            )}
                          </ExpandableCardPanel>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {mealsLoadingMore && (
                <div className="dashboard-grid cols-3 mt-4">
                  {[...Array(3)].map((_, i) => <div key={i} className="glass skeleton h-72 rounded-2xl" />)}
                </div>
              )}

              {mealPage < mealTotalPages && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => void loadMoreMeals()}
                    disabled={mealsLoadingMore}
                    className="btn-accent px-8 py-3 text-sm font-bold disabled:opacity-50"
                  >
                    {mealsLoadingMore ? 'Loading...' : `Load more (${recipeMeals.length} of ${mealTotal})`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
