import { calculateDailyCalories, type CalorieProfileInput } from '@/lib/nutrition'

type FitnessGoal = 'weight_loss' | 'muscle_gain' | 'endurance' | 'flexibility' | 'general_fitness'

interface MealTemplate {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  notes?: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MEAL_POOLS: Record<FitnessGoal, MealTemplate[]> = {
  weight_loss: [
    { mealType: 'breakfast', name: 'Greek yogurt parfait', calories: 320, protein: 28, carbs: 32, fat: 8, notes: 'Low sugar berries' },
    { mealType: 'breakfast', name: 'Egg white veggie scramble', calories: 280, protein: 26, carbs: 14, fat: 12 },
    { mealType: 'breakfast', name: 'Overnight oats with protein', calories: 350, protein: 30, carbs: 40, fat: 8 },
    { mealType: 'lunch', name: 'Grilled chicken salad', calories: 420, protein: 42, carbs: 18, fat: 18 },
    { mealType: 'lunch', name: 'Turkey wrap + greens', calories: 400, protein: 35, carbs: 32, fat: 14 },
    { mealType: 'lunch', name: 'Lentil soup + side salad', calories: 380, protein: 22, carbs: 48, fat: 10 },
    { mealType: 'dinner', name: 'Baked salmon + broccoli', calories: 480, protein: 40, carbs: 16, fat: 26 },
    { mealType: 'dinner', name: 'Lean beef stir-fry', calories: 450, protein: 38, carbs: 28, fat: 18 },
    { mealType: 'dinner', name: 'Tofu veggie bowl', calories: 400, protein: 28, carbs: 36, fat: 14 },
    { mealType: 'snack', name: 'Apple + almond butter', calories: 200, protein: 6, carbs: 22, fat: 10 },
    { mealType: 'snack', name: 'Protein shake', calories: 180, protein: 25, carbs: 8, fat: 4 },
    { mealType: 'snack', name: 'Cottage cheese cup', calories: 160, protein: 22, carbs: 6, fat: 4 },
  ],
  muscle_gain: [
    { mealType: 'breakfast', name: 'Protein pancakes', calories: 520, protein: 40, carbs: 55, fat: 14 },
    { mealType: 'breakfast', name: 'Eggs, toast & avocado', calories: 560, protein: 32, carbs: 42, fat: 28 },
    { mealType: 'breakfast', name: 'Oatmeal + whey + banana', calories: 500, protein: 38, carbs: 62, fat: 10 },
    { mealType: 'lunch', name: 'Chicken rice bowl', calories: 650, protein: 48, carbs: 70, fat: 16 },
    { mealType: 'lunch', name: 'Beef burrito bowl', calories: 700, protein: 45, carbs: 68, fat: 24 },
    { mealType: 'lunch', name: 'Tuna pasta salad', calories: 620, protein: 42, carbs: 65, fat: 18 },
    { mealType: 'dinner', name: 'Steak + sweet potato', calories: 720, protein: 52, carbs: 55, fat: 28 },
    { mealType: 'dinner', name: 'Salmon + quinoa', calories: 680, protein: 46, carbs: 50, fat: 28 },
    { mealType: 'dinner', name: 'Chicken pasta primavera', calories: 700, protein: 48, carbs: 72, fat: 18 },
    { mealType: 'snack', name: 'Mass gainer shake', calories: 350, protein: 30, carbs: 40, fat: 8 },
    { mealType: 'snack', name: 'Peanut butter sandwich', calories: 380, protein: 16, carbs: 36, fat: 20 },
    { mealType: 'snack', name: 'Greek yogurt + granola', calories: 300, protein: 24, carbs: 34, fat: 8 },
  ],
  endurance: [
    { mealType: 'breakfast', name: 'Banana oatmeal bowl', calories: 420, protein: 18, carbs: 68, fat: 10 },
    { mealType: 'breakfast', name: 'Whole grain toast + eggs', calories: 400, protein: 22, carbs: 42, fat: 14 },
    { mealType: 'breakfast', name: 'Fruit smoothie bowl', calories: 380, protein: 16, carbs: 62, fat: 8 },
    { mealType: 'lunch', name: 'Chicken quinoa salad', calories: 520, protein: 38, carbs: 48, fat: 16 },
    { mealType: 'lunch', name: 'Turkey sandwich + fruit', calories: 500, protein: 32, carbs: 55, fat: 14 },
    { mealType: 'lunch', name: 'Rice + beans + veggies', calories: 480, protein: 20, carbs: 72, fat: 10 },
    { mealType: 'dinner', name: 'Pasta with lean turkey', calories: 580, protein: 36, carbs: 70, fat: 14 },
    { mealType: 'dinner', name: 'Grilled fish + couscous', calories: 540, protein: 40, carbs: 52, fat: 16 },
    { mealType: 'dinner', name: 'Chicken sweet potato hash', calories: 560, protein: 42, carbs: 50, fat: 16 },
    { mealType: 'snack', name: 'Trail mix portion', calories: 220, protein: 8, carbs: 20, fat: 14 },
    { mealType: 'snack', name: 'Banana + honey', calories: 180, protein: 2, carbs: 42, fat: 0 },
    { mealType: 'snack', name: 'Energy bar', calories: 200, protein: 10, carbs: 28, fat: 6 },
  ],
  flexibility: [
    { mealType: 'breakfast', name: 'Chia pudding + berries', calories: 340, protein: 12, carbs: 38, fat: 16 },
    { mealType: 'breakfast', name: 'Smoothie with greens', calories: 320, protein: 18, carbs: 40, fat: 10 },
    { mealType: 'breakfast', name: 'Avocado toast + egg', calories: 380, protein: 16, carbs: 32, fat: 20 },
    { mealType: 'lunch', name: 'Buddha bowl', calories: 460, protein: 22, carbs: 48, fat: 18 },
    { mealType: 'lunch', name: 'Salmon poke bowl', calories: 480, protein: 32, carbs: 42, fat: 18 },
    { mealType: 'lunch', name: 'Mediterranean plate', calories: 450, protein: 24, carbs: 40, fat: 20 },
    { mealType: 'dinner', name: 'Herb chicken + roasted veg', calories: 480, protein: 40, carbs: 28, fat: 20 },
    { mealType: 'dinner', name: 'Miso glazed tofu + rice', calories: 440, protein: 26, carbs: 48, fat: 14 },
    { mealType: 'dinner', name: 'Baked white fish + greens', calories: 420, protein: 38, carbs: 20, fat: 16 },
    { mealType: 'snack', name: 'Hummus + carrots', calories: 180, protein: 6, carbs: 18, fat: 10 },
    { mealType: 'snack', name: 'Mixed nuts handful', calories: 200, protein: 6, carbs: 8, fat: 16 },
    { mealType: 'snack', name: 'Kefir smoothie', calories: 160, protein: 12, carbs: 18, fat: 4 },
  ],
  general_fitness: [
    { mealType: 'breakfast', name: 'Balanced breakfast plate', calories: 400, protein: 25, carbs: 40, fat: 14 },
    { mealType: 'breakfast', name: 'Yogurt + granola bowl', calories: 380, protein: 22, carbs: 45, fat: 12 },
    { mealType: 'breakfast', name: 'Veggie omelette + toast', calories: 420, protein: 28, carbs: 30, fat: 18 },
    { mealType: 'lunch', name: 'Chicken grain bowl', calories: 520, protein: 40, carbs: 48, fat: 16 },
    { mealType: 'lunch', name: 'Turkey club wrap', calories: 500, protein: 35, carbs: 42, fat: 18 },
    { mealType: 'lunch', name: 'Salmon salad plate', calories: 480, protein: 36, carbs: 28, fat: 22 },
    { mealType: 'dinner', name: 'Lean protein + veggies', calories: 520, protein: 42, carbs: 35, fat: 18 },
    { mealType: 'dinner', name: 'Shrimp stir-fry + rice', calories: 500, protein: 38, carbs: 48, fat: 14 },
    { mealType: 'dinner', name: 'Chicken fajita bowl', calories: 540, protein: 40, carbs: 45, fat: 18 },
    { mealType: 'snack', name: 'Protein yogurt', calories: 180, protein: 20, carbs: 12, fat: 4 },
    { mealType: 'snack', name: 'Fruit + cheese', calories: 200, protein: 10, carbs: 20, fat: 8 },
    { mealType: 'snack', name: 'Rice cakes + peanut butter', calories: 220, protein: 8, carbs: 24, fat: 10 },
  ],
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items]
  let state = seed >>> 0
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function pickMeals(pool: MealTemplate[], dayIndex: number, variationSeed: number): MealTemplate[] {
  const byType = (type: MealTemplate['mealType']) =>
    pool.filter((m) => m.mealType === type)

  const breakfasts = shuffleWithSeed(byType('breakfast'), variationSeed + dayIndex * 3)
  const lunches = shuffleWithSeed(byType('lunch'), variationSeed + dayIndex * 5 + 1)
  const dinners = shuffleWithSeed(byType('dinner'), variationSeed + dayIndex * 7 + 2)
  const snacks = shuffleWithSeed(byType('snack'), variationSeed + dayIndex * 11 + 3)

  return [
    breakfasts[dayIndex % breakfasts.length],
    lunches[(dayIndex + 1) % lunches.length],
    dinners[(dayIndex + 2) % dinners.length],
    snacks[(dayIndex + 3) % snacks.length],
  ]
}

function scaleMeals(meals: MealTemplate[], targetCalories: number): MealTemplate[] {
  const current = meals.reduce((sum, m) => sum + m.calories, 0) || 1
  const ratio = targetCalories / current

  return meals.map((meal) => ({
    ...meal,
    calories: Math.round(meal.calories * ratio),
    protein: Math.round(meal.protein * ratio * 10) / 10,
    carbs: Math.round(meal.carbs * ratio * 10) / 10,
    fat: Math.round(meal.fat * ratio * 10) / 10,
    notes: meal.notes || '',
  }))
}

export interface GenerateMealPlanInput extends CalorieProfileInput {
  goal?: string
  preferenceNotes?: string
  title?: string
  dailyCaloriesOverride?: number
}

export interface GeneratedMealPlan {
  title: string
  goal: FitnessGoal
  dailyCalories: number
  preferenceNotes: string
  days: Array<{
    day: string
    meals: Array<{
      mealType: string
      name: string
      calories: number
      protein: number
      carbs: number
      fat: number
      notes: string
    }>
  }>
  status: 'draft'
}

function normalizeGoal(goal?: string): FitnessGoal {
  if (goal === 'maintenance') return 'general_fitness'
  const allowed: FitnessGoal[] = ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness']
  if (goal && allowed.includes(goal as FitnessGoal)) return goal as FitnessGoal
  return 'general_fitness'
}

export function generateMealPlan(input: GenerateMealPlanInput): GeneratedMealPlan {
  const goal = normalizeGoal(input.goal || input.fitnessGoal)
  const dailyCalories = input.dailyCaloriesOverride && input.dailyCaloriesOverride > 0
    ? Math.round(input.dailyCaloriesOverride)
    : calculateDailyCalories({
        currentWeight: input.currentWeight,
        targetWeight: input.targetWeight,
        fitnessGoal: goal,
        activityLevel: input.activityLevel,
      })

  const pool = MEAL_POOLS[goal]
  const goalLabel = goal.replace(/_/g, ' ')
  const stamp = new Date().toISOString().slice(0, 10)
  const variationSeed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0
  const title =
    input.title?.trim() || `${goalLabel} meal plan · ${dailyCalories} kcal · ${stamp}`

  const days = DAYS.map((day, index) => ({
    day,
    meals: scaleMeals(pickMeals(pool, index, variationSeed), dailyCalories).map((meal) => ({
      mealType: meal.mealType,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      notes: [
        meal.notes,
        input.preferenceNotes?.trim() ? `Prefs: ${input.preferenceNotes.trim()}` : '',
      ].filter(Boolean).join(' · '),
    })),
  }))

  return {
    title,
    goal,
    dailyCalories,
    preferenceNotes: input.preferenceNotes?.trim() || '',
    days,
    status: 'draft',
  }
}
