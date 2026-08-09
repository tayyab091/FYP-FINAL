import { getCached, getOrFetch, paginate } from '@/lib/server-cache'

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
    name: (meal.strMeal || 'Unknown meal').trim(),
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

async function fetchCategoryMeals(category: string): Promise<MealSummary[]> {
  const data = await fetchMealDb(`filter.php?c=${encodeURIComponent(category)}`)
  return (data.meals || []).map((meal: Record<string, string>) =>
    toSummary({ ...meal, strCategory: category }),
  )
}

async function fetchAreaMeals(area: string): Promise<MealSummary[]> {
  const data = await fetchMealDb(`filter.php?a=${encodeURIComponent(area)}`)
  return (data.meals || []).map((meal: Record<string, string>) =>
    toSummary({ ...meal, strArea: area }),
  )
}

export async function getMealMetaFast(): Promise<MealCatalogMeta> {
  return getOrFetch('meal-meta-v1', CACHE_TTL, async () => {
    const [categoriesData, areasData] = await Promise.all([
      fetchMealDb('list.php?c=list'),
      fetchMealDb('list.php?a=list'),
    ])
    const categories: string[] = (categoriesData.meals || []).map(
      (m: { strCategory: string }) => m.strCategory,
    )
    const areas: string[] = (areasData.meals || []).map((m: { strArea: string }) => m.strArea)
    return {
      categories: [...new Set(categories)].sort(),
      areas: [...new Set(areas)].sort(),
      total: 0,
    }
  })
}

function warmMealCatalog(): void {
  if (getCached<MealCatalog>('meal-catalog-v3')) return
  void getMealCatalog()
}

async function fetchMealsDirect(options: {
  search?: string
  category?: string
  area?: string
}): Promise<MealSummary[]> {
  if (options.search) {
    const remote = await searchMeals(options.search)
    if (remote.length > 0) return remote
  }
  if (options.category && options.category !== 'All') {
    return fetchCategoryMeals(options.category)
  }
  if (options.area && options.area !== 'All') {
    return fetchAreaMeals(options.area)
  }

  const meta = await getMealMetaFast()
  const starterCategories = meta.categories.slice(0, 3)
  const batches = await Promise.all(starterCategories.map((category) => fetchCategoryMeals(category)))
  const byId = new Map<string, MealSummary>()
  for (const batch of batches) {
    for (const meal of batch) {
      const existing = byId.get(meal.id)
      byId.set(meal.id, existing ? { ...existing, ...meal } : meal)
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function queryMealsFromCatalog(
  meals: MealSummary[],
  meta: MealCatalogMeta,
  options: {
    search?: string
    category?: string
    area?: string
    letter?: string
    page?: number
    limit?: number
    includeMeta?: boolean
  },
): MealQueryResult {
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

  const categoryBatches = await Promise.all(
    categories.map(async (category) => {
      try {
        return await fetchCategoryMeals(category)
      } catch {
        return []
      }
    }),
  )

  for (const batch of categoryBatches) {
    for (const meal of batch) {
      const existing = byId.get(meal.id)
      byId.set(meal.id, {
        ...meal,
        area: existing?.area || meal.area || 'International',
      })
    }
  }

  const areaBatches = await Promise.all(
    areas.map(async (area) => {
      try {
        return await fetchAreaMeals(area)
      } catch {
        return []
      }
    }),
  )

  for (const batch of areaBatches) {
    for (const meal of batch) {
      const existing = byId.get(meal.id)
      if (existing) {
        byId.set(meal.id, { ...existing, area: meal.area })
      } else {
        byId.set(meal.id, { ...meal, category: meal.category || 'Miscellaneous' })
      }
    }
  }

  const meals = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))

  return {
    meals,
    meta: {
      categories: [...new Set(categories)].sort(),
      areas: [...new Set(areas)].sort(),
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
  const needsFullCatalog = options.letter && options.letter !== 'All'
  const cached = getCached<MealCatalog>('meal-catalog-v3')

  if (cached) {
    return queryMealsFromCatalog(cached.meals, cached.meta, options)
  }

  if (needsFullCatalog) {
    const catalog = await getMealCatalog()
    return queryMealsFromCatalog(catalog.meals, catalog.meta, options)
  }

  warmMealCatalog()
  const meta = await getMealMetaFast()
  const meals = await fetchMealsDirect(options)
  const warmed = getCached<MealCatalog>('meal-catalog-v3')
  const catalogMeta: MealCatalogMeta = {
    ...meta,
    total: warmed?.meta.total ?? meals.length,
  }

  return queryMealsFromCatalog(meals, catalogMeta, { ...options, includeMeta: options.includeMeta })
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
  const { categories } = await getMealMetaFast()
  return categories
}

export async function listAreas(): Promise<string[]> {
  const { areas } = await getMealMetaFast()
  return areas
}
