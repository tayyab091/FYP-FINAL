import { getOrFetch, paginate } from '@/lib/server-cache'

const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export interface MealSummary {
  id: string
  name: string
  category: string
  area: string
  thumb: string
  tags?: string
}

export interface MealDetail extends MealSummary {
  instructions: string
  youtube?: string
  source?: string
  ingredients: { name: string; measure: string }[]
}

export interface MealCatalogMeta {
  categories: string[]
  areas: string[]
  total: number
}

export interface MealQueryResult {
  meals: MealSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
  meta?: MealCatalogMeta
}

interface MealCatalog {
  meals: MealSummary[]
  meta: MealCatalogMeta
}

function parseIngredients(meal: Record<string, string | null | undefined>) {
  const ingredients: { name: string; measure: string }[] = []
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim()
    if (!name) continue
    const measure = meal[`strMeasure${i}`]?.trim() || ''
    ingredients.push({ name, measure })
  }
  return ingredients
}

function toSummary(meal: Record<string, string | null | undefined>): MealSummary {
  return {
    id: meal.idMeal || '',
    name: meal.strMeal || 'Unknown meal',
    category: meal.strCategory || 'Miscellaneous',
    area: meal.strArea || 'International',
    thumb: meal.strMealThumb || '',
    tags: meal.strTags || undefined,
  }
}

function toDetail(meal: Record<string, string | null | undefined>): MealDetail {
  return {
    ...toSummary(meal),
    instructions: (meal.strInstructions || '').replace(/\r\n/g, '\n').trim(),
    youtube: meal.strYoutube || undefined,
    source: meal.strSource || undefined,
    ingredients: parseIngredients(meal),
  }
}

async function fetchMealDb(path: string) {
  const res = await fetch(`${MEALDB_BASE}/${path}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`MealDB request failed: ${res.status}`)
  return res.json()
}

async function buildMealCatalog(): Promise<MealCatalog> {
  const [categoriesData, areasData] = await Promise.all([
    fetchMealDb('list.php?c=list'),
    fetchMealDb('list.php?a=list'),
  ])

  const categories: string[] = (categoriesData.meals || []).map(
    (m: { strCategory: string }) => m.strCategory,
  )
  const areas: string[] = (areasData.meals || []).map((m: { strArea: string }) => m.strArea)

  const byId = new Map<string, MealSummary>()

  for (const category of categories) {
    try {
      const data = await fetchMealDb(`filter.php?c=${encodeURIComponent(category)}`)
      for (const meal of data.meals || []) {
        const existing = byId.get(meal.idMeal)
        byId.set(meal.idMeal, {
          ...toSummary(meal),
          category,
          area: existing?.area || 'International',
        })
      }
      await new Promise((r) => setTimeout(r, 40))
    } catch {
      // skip failed category
    }
  }

  for (const area of areas) {
    try {
      const data = await fetchMealDb(`filter.php?a=${encodeURIComponent(area)}`)
      for (const meal of data.meals || []) {
        const existing = byId.get(meal.idMeal)
        if (existing) {
          byId.set(meal.idMeal, { ...existing, area })
        } else {
          byId.set(meal.idMeal, {
            ...toSummary(meal),
            area,
            category: 'Miscellaneous',
          })
        }
      }
      await new Promise((r) => setTimeout(r, 40))
    } catch {
      // skip failed area
    }
  }

  const meals = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))

  return {
    meals,
    meta: {
      categories: categories.sort(),
      areas: areas.sort(),
      total: meals.length,
    },
  }
}

export async function getMealCatalog(): Promise<MealCatalog> {
  return getOrFetch('meal-catalog-v3', CACHE_TTL, buildMealCatalog)
}

export async function queryMeals(options: {
  search?: string
  category?: string
  area?: string
  letter?: string
  page?: number
  limit?: number
  includeMeta?: boolean
}): Promise<MealQueryResult> {
  const { meals, meta } = await getMealCatalog()
  let filtered = meals

  if (options.search) {
    const q = options.search.toLowerCase()
    filtered = filtered.filter((m) => m.name.toLowerCase().includes(q))
  }
  if (options.category && options.category !== 'All') {
    filtered = filtered.filter((m) => m.category === options.category)
  }
  if (options.area && options.area !== 'All') {
    filtered = filtered.filter((m) => m.area === options.area)
  }
  if (options.letter && options.letter !== 'All') {
    const letter = options.letter.toUpperCase()
    filtered = filtered.filter((m) => m.name.toUpperCase().startsWith(letter))
  }

  const limit = Math.min(100, Math.max(1, options.limit ?? 24))
  const page = Math.max(1, options.page ?? 1)
  const paged = paginate(filtered, page, limit)

  return {
    meals: paged.items,
    total: paged.total,
    page: paged.page,
    limit: paged.limit,
    totalPages: paged.totalPages,
    ...(options.includeMeta ? { meta } : {}),
  }
}

export async function searchMeals(query: string): Promise<MealSummary[]> {
  const data = await fetchMealDb(`search.php?s=${encodeURIComponent(query)}`)
  return (data.meals || []).map((m: Record<string, string>) => toSummary(m))
}

export async function filterMealsByCategory(category: string): Promise<MealSummary[]> {
  const result = await queryMeals({ category, limit: 100, page: 1 })
  if (result.meals.length > 0) return result.meals
  const data = await fetchMealDb(`filter.php?c=${encodeURIComponent(category)}`)
  return (data.meals || []).map((m: Record<string, string>) => toSummary(m))
}

export async function filterMealsByArea(area: string): Promise<MealSummary[]> {
  const result = await queryMeals({ area, limit: 100, page: 1 })
  if (result.meals.length > 0) return result.meals
  const data = await fetchMealDb(`filter.php?a=${encodeURIComponent(area)}`)
  return (data.meals || []).map((m: Record<string, string>) => toSummary(m))
}

export async function getRandomMeals(count = 6): Promise<MealSummary[]> {
  const { meals } = await getMealCatalog()
  if (meals.length === 0) {
    const fetches = Array.from({ length: count }, () => fetchMealDb('random.php'))
    const results = await Promise.allSettled(fetches)
    const seen = new Set<string>()
    const randomMeals: MealSummary[] = []
    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      const meal = result.value.meals?.[0]
      if (!meal?.idMeal || seen.has(meal.idMeal)) continue
      seen.add(meal.idMeal)
      randomMeals.push(toSummary(meal))
    }
    return randomMeals
  }

  const shuffled = [...meals].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export async function getMealById(id: string): Promise<MealDetail | null> {
  const data = await fetchMealDb(`lookup.php?i=${encodeURIComponent(id)}`)
  const meal = data.meals?.[0]
  if (!meal) return null
  return toDetail(meal)
}

export async function listCategories(): Promise<string[]> {
  const { meta } = await getMealCatalog()
  return meta.categories
}

export async function listAreas(): Promise<string[]> {
  const { meta } = await getMealCatalog()
  return meta.areas
}
