'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const CALORIE_GOAL = 2000

const PAKISTANI_RECIPES = [
  { name: 'Chicken Biryani Bowl', calories: 480, protein: 35, carbs: 52, fat: 12, time: '30 min', tag: 'High Protein', emoji: '🍚' },
  { name: 'Daal Chawal', calories: 380, protein: 18, carbs: 65, fat: 6, time: '25 min', tag: 'Balanced', emoji: '🫘' },
  { name: 'Grilled Fish with Salad', calories: 320, protein: 42, carbs: 15, fat: 10, time: '20 min', tag: 'Low Carb', emoji: '🐟' },
  { name: 'Egg Paratha', calories: 420, protein: 22, carbs: 45, fat: 16, time: '15 min', tag: 'Breakfast', emoji: '🍳' },
  { name: 'Fruit Chaat', calories: 180, protein: 3, carbs: 42, fat: 1, time: '10 min', tag: 'Snack', emoji: '🍓' },
  { name: 'Nihari with Naan', calories: 520, protein: 28, carbs: 48, fat: 22, time: '45 min', tag: 'Traditional', emoji: '🥘' },
]

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
  const [meals, setMeals] = useState<MealEntry[]>([])
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

  const fetchTodayMeals = useCallback(async () => {
    if (!user) return
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    setSummaryLoading(true)

    try {
      const res = await fetch('/api/tracking/meal-logs/today', {
        credentials: 'include',
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        setMeals(data.meals || [])
        setTotals(data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 })
      } else {
        setMeals([])
        setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 })
      }
    } catch {
      setMeals([])
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
    const timeout = setTimeout(() => controller.abort(), 8000)

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
    const timeout = setTimeout(() => controller.abort(), 8000)

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

  const calorieProgress = Math.min(100, Math.round((totals.calories / CALORIE_GOAL) * 100))
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-24 px-4 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <span className="text-[#00ff87] text-sm font-semibold uppercase tracking-widest">Nutrition</span>
          <h1 className="text-3xl md:text-4xl font-black text-white mt-2">Track Your Meals</h1>
          <p className="text-[#a0a0a0] mt-1">{todayLabel}</p>
        </div>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Daily Summary</h2>

          {authLoading || (user && summaryLoading) ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="glass rounded-2xl p-5 skeleton h-24" />)}
            </div>
          ) : !user ? (
            <div className="glass rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">🥗</div>
              <p className="text-white font-semibold mb-2">Sign in to track nutrition</p>
              <p className="text-[#a0a0a0] text-sm mb-6">Log meals, monitor macros, and hit your daily goals.</p>
              <Link href="/login" className="btn-accent px-6 py-3 text-sm">Sign In</Link>
            </div>
          ) : summaryLoaded && meals.length === 0 ? (
            <div className="space-y-4">
              <div className="glass rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-white font-medium">No meals logged today</p>
                <p className="text-[#a0a0a0] text-sm mt-1">Search for a food below and log your first meal.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Calories', value: 0, color: 'text-[#00ff87]' },
                  { label: 'Protein', value: '0g', color: 'text-red-400' },
                  { label: 'Carbs', value: '0g', color: 'text-blue-400' },
                  { label: 'Fat', value: '0g', color: 'text-yellow-400' },
                ].map(m => (
                  <div key={m.label} className="glass rounded-2xl p-5">
                    <p className="text-[#a0a0a0] text-xs uppercase tracking-wider">{m.label}</p>
                    <p className={`text-2xl font-black mt-1 ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass rounded-2xl p-5 border border-[#00ff87]/20">
                  <p className="text-[#a0a0a0] text-xs uppercase tracking-wider">Calories</p>
                  <p className="text-2xl font-black text-[#00ff87] mt-1">{Math.round(totals.calories)}</p>
                  <p className="text-[#555] text-xs mt-1">/ {CALORIE_GOAL} goal</p>
                </div>
                <div className="glass rounded-2xl p-5">
                  <p className="text-[#a0a0a0] text-xs uppercase tracking-wider">Protein</p>
                  <p className="text-2xl font-black text-red-400 mt-1">{Math.round(totals.protein)}g</p>
                </div>
                <div className="glass rounded-2xl p-5">
                  <p className="text-[#a0a0a0] text-xs uppercase tracking-wider">Carbs</p>
                  <p className="text-2xl font-black text-blue-400 mt-1">{Math.round(totals.carbs)}g</p>
                </div>
                <div className="glass rounded-2xl p-5">
                  <p className="text-[#a0a0a0] text-xs uppercase tracking-wider">Fat</p>
                  <p className="text-2xl font-black text-yellow-400 mt-1">{Math.round(totals.fat)}g</p>
                </div>
              </div>

              <div className="glass rounded-2xl p-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#a0a0a0]">Calorie progress</span>
                  <span className="text-white font-medium">{Math.round(totals.calories)} / {CALORIE_GOAL} cal</span>
                </div>
                <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#00ff87] to-[#00bfff] rounded-full transition-all duration-500"
                    style={{ width: `${calorieProgress}%` }} />
                </div>
                <p className="text-[#555] text-xs mt-2">{calorieProgress}% of daily goal</p>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Food Search</h2>
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex gap-3">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder='e.g. "chicken biryani" or "roti"'
                className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] outline-none focus:border-[#00ff87]"
              />
              <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
                className="btn-accent px-6 py-3 text-sm font-bold disabled:opacity-50">
                {searching ? (
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin inline-block" />
                ) : 'Search'}
              </button>
            </div>

            {!user && !authLoading && (
              <p className="text-[#a0a0a0] text-sm text-center py-2">Sign in to search and log foods</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((item, idx) => (
                  <div key={idx} className="glass rounded-xl p-4 border border-[#2a2a2a]">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold capitalize">{item.name}</p>
                        <p className="text-[#a0a0a0] text-sm mt-1">{item.calories} cal per {item.per}</p>
                        <p className="text-[#555] text-xs mt-1">P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g</p>
                      </div>
                      <button
                        onClick={() => { setLoggingFood(loggingFood?.name === item.name ? null : item); setLogQuantity('100') }}
                        className="text-xs px-4 py-2 rounded-xl bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/30 hover:bg-[#00ff87]/20 font-medium shrink-0">
                        Log This
                      </button>
                    </div>

                    {loggingFood?.name === item.name && (
                      <div className="mt-4 pt-4 border-t border-[#2a2a2a] space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[#a0a0a0] text-xs block mb-1">Meal type</label>
                            <select value={logMealType} onChange={e => setLogMealType(e.target.value)}
                              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#00ff87]">
                              {MEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[#a0a0a0] text-xs block mb-1">Quantity (g)</label>
                            <input type="number" min="1" value={logQuantity} onChange={e => setLogQuantity(e.target.value)}
                              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#00ff87]" />
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

        {user && meals.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4">Today&apos;s Meals</h2>
            <div className="space-y-3">
              {meals.map(meal => (
                <div key={meal._id} className="glass rounded-xl p-4 border border-[#2a2a2a]">
                  <p className="text-[#00ff87] text-xs font-semibold uppercase mb-2">{meal.mealType}</p>
                  {meal.foods.map((food, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-white">{food.name}</span>
                      <span className="text-[#00ff87] font-medium">{Math.round(food.calories)} cal</span>
                    </div>
                  ))}
                  <p className="text-[#555] text-xs mt-2">
                    P: {Math.round(meal.totalProtein)}g · C: {Math.round(meal.totalCarbs)}g · F: {Math.round(meal.totalFat)}g
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Pakistani Recipes</h2>
            <span className="text-[#555] text-xs">Curated picks</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAKISTANI_RECIPES.map((recipe, idx) => (
              <div key={idx} className="glass rounded-2xl p-5 hover:border-[#00ff87]/20 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{recipe.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold leading-tight">{recipe.name}</p>
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wider text-[#00ff87] bg-[#00ff87]/10 px-2 py-0.5 rounded-full">
                      {recipe.tag}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-[#555]">Calories</p><p className="text-white font-bold">{recipe.calories}</p></div>
                  <div><p className="text-[#555]">Protein</p><p className="text-white font-bold">{recipe.protein}g</p></div>
                  <div><p className="text-[#555]">Carbs</p><p className="text-white font-bold">{recipe.carbs}g</p></div>
                  <div><p className="text-[#555]">Fat</p><p className="text-white font-bold">{recipe.fat}g</p></div>
                </div>
                <p className="text-[#555] text-xs mt-3">⏱ {recipe.time}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
