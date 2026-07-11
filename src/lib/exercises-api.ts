import { getOrFetch, paginate } from '@/lib/server-cache'

const EXERCISEDB_BASE = 'https://oss.exercisedb.dev/api/v1'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const PAGE_SIZE = 25
const PAGE_DELAY_MS = 350

export interface LibraryExercise {
  id: string
  name: string
  muscle: string
  equipment: string
  difficulty: string
  gifUrl: string
  instructions: string
  sets: number
  reps: string
  bodyParts: string[]
  targetMuscles: string[]
}

export interface ExerciseCatalogMeta {
  bodyParts: string[]
  targetMuscles: string[]
  equipment: string[]
  muscles: string[]
  total: number
}

export interface ExerciseQueryResult {
  exercises: LibraryExercise[]
  total: number
  page: number
  limit: number
  totalPages: number
  meta?: ExerciseCatalogMeta
}

interface ExerciseCatalog {
  exercises: LibraryExercise[]
  meta: ExerciseCatalogMeta
}

const MUSCLE_MAP: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  'upper arms': 'Arms',
  'lower arms': 'Arms',
  'upper legs': 'Legs',
  'lower legs': 'Legs',
  waist: 'Core',
  cardio: 'Cardio',
  neck: 'Shoulders',
}

const FALLBACK_EXERCISES: LibraryExercise[] = [
  { id: '1', name: 'Push-Up', muscle: 'Chest', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Pushup_from_the_side.gif/320px-Pushup_from_the_side.gif', instructions: 'Start in high plank. Lower chest to floor keeping elbows at 45°. Push back up explosively.', sets: 3, reps: '15', bodyParts: ['chest'], targetMuscles: ['pectorals'] },
  { id: '2', name: 'Squat', muscle: 'Legs', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Squat_animation.gif/240px-Squat_animation.gif', instructions: 'Feet shoulder-width. Push hips back and down until thighs parallel. Drive through heels to stand.', sets: 3, reps: '20', bodyParts: ['upper legs'], targetMuscles: ['quadriceps'] },
  { id: '3', name: 'Plank', muscle: 'Core', equipment: 'Bodyweight', difficulty: 'Beginner', gifUrl: 'https://media1.tenor.com/m/TFUbZgW7RLEAAAAC/plank.gif', instructions: 'Forearms on ground elbows under shoulders. Body straight from head to heels.', sets: 3, reps: '45 sec', bodyParts: ['waist'], targetMuscles: ['abs'] },
]

function normalizeMuscle(bodyPart?: string): string {
  if (!bodyPart) return 'Core'
  const key = bodyPart.toLowerCase()
  return MUSCLE_MAP[key] || bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1)
}

function normalizeEquipment(equipment?: string): string {
  if (!equipment) return 'Bodyweight'
  return equipment
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}

function mapExercise(raw: {
  exerciseId: string
  name: string
  gifUrl?: string
  bodyParts?: string[]
  equipments?: string[]
  targetMuscles?: string[]
  secondaryMuscles?: string[]
  instructions?: string[]
}): LibraryExercise {
  const bodyPart = raw.bodyParts?.[0]
  const instructions = (raw.instructions || [])
    .map((step) => step.replace(/^Step:\d+\s*/i, '').trim())
    .filter(Boolean)
    .join(' ')

  return {
    id: raw.exerciseId,
    name: titleCase(raw.name),
    muscle: normalizeMuscle(bodyPart),
    equipment: normalizeEquipment(raw.equipments?.[0]),
    difficulty: 'Intermediate',
    gifUrl: raw.gifUrl || '',
    instructions: instructions || 'Follow the animated demonstration with controlled form.',
    sets: 3,
    reps: '12',
    bodyParts: raw.bodyParts || [],
    targetMuscles: raw.targetMuscles || [],
  }
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function buildMeta(exercises: LibraryExercise[]): ExerciseCatalogMeta {
  return {
    bodyParts: uniqueSorted(exercises.flatMap((e) => e.bodyParts)),
    targetMuscles: uniqueSorted(exercises.flatMap((e) => e.targetMuscles)),
    equipment: uniqueSorted(exercises.map((e) => e.equipment)),
    muscles: uniqueSorted(exercises.map((e) => e.muscle)),
    total: exercises.length,
  }
}

async function fetchJson<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { next: { revalidate: 86400 } })
      const text = await res.text()
      if (!res.ok || !text.startsWith('{')) {
        throw new Error(`ExerciseDB error: ${res.status}`)
      }
      return JSON.parse(text) as T
    } catch (err) {
      if (attempt === retries - 1) throw err
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
    }
  }
  throw new Error('ExerciseDB unavailable')
}

async function fetchAllExercisesFromApi(): Promise<LibraryExercise[]> {
  const exercises: LibraryExercise[] = []
  let cursor: string | null = null
  let pages = 0
  const maxPages = 70
  let consecutiveErrors = 0

  while (pages < maxPages) {
    const url: string = cursor
      ? `${EXERCISEDB_BASE}/exercises?limit=${PAGE_SIZE}&after=${encodeURIComponent(cursor)}`
      : `${EXERCISEDB_BASE}/exercises?limit=${PAGE_SIZE}`

    try {
      const json = await fetchJson<{
        data?: Parameters<typeof mapExercise>[0][]
        meta?: { hasNextPage?: boolean; nextCursor?: string }
      }>(url)

      const batch = (json.data || []).map(mapExercise)
      exercises.push(...batch)
      pages++
      consecutiveErrors = 0

      if (!json.meta?.hasNextPage || !json.meta.nextCursor) break
      cursor = json.meta.nextCursor
      await new Promise((r) => setTimeout(r, PAGE_DELAY_MS))
    } catch {
      consecutiveErrors++
      if (consecutiveErrors >= 3 && exercises.length > 0) break
      if (consecutiveErrors >= 5) break
      await new Promise((r) => setTimeout(r, 1500 * consecutiveErrors))
    }
  }

  return exercises.length > 0 ? exercises : FALLBACK_EXERCISES
}

async function fetchFilterLists(): Promise<{ bodyParts: string[]; equipment: string[]; muscles: string[] }> {
  try {
    const [bodyPartsRes, equipmentRes, musclesRes] = await Promise.all([
      fetchJson<{ data?: { name: string }[] }>(`${EXERCISEDB_BASE}/bodyparts`),
      fetchJson<{ data?: { name: string }[] }>(`${EXERCISEDB_BASE}/equipments`),
      fetchJson<{ data?: { name: string }[] }>(`${EXERCISEDB_BASE}/muscles`),
    ])
    return {
      bodyParts: (bodyPartsRes.data || []).map((b) => b.name),
      equipment: (equipmentRes.data || []).map((e) => titleCase(e.name)),
      muscles: (musclesRes.data || []).map((m) => titleCase(m.name)),
    }
  } catch {
    return { bodyParts: [], equipment: [], muscles: [] }
  }
}

export async function getExerciseCatalog(): Promise<ExerciseCatalog> {
  return getOrFetch('exercise-catalog-v3', CACHE_TTL, async () => {
    try {
      const exercises = await fetchAllExercisesFromApi()
      const lists = await fetchFilterLists()
      const meta = buildMeta(exercises)
      if (lists.bodyParts.length) meta.bodyParts = uniqueSorted(lists.bodyParts)
      if (lists.equipment.length) {
        meta.equipment = uniqueSorted([...meta.equipment, ...lists.equipment])
      }
      return { exercises, meta }
    } catch {
      const exercises = FALLBACK_EXERCISES
      return { exercises, meta: buildMeta(exercises) }
    }
  })
}

export async function queryExercises(options: {
  search?: string
  muscle?: string
  bodyPart?: string
  target?: string
  equipment?: string
  page?: number
  limit?: number
  includeMeta?: boolean
}): Promise<ExerciseQueryResult> {
  const { exercises, meta } = await getExerciseCatalog()
  let filtered = exercises

  if (options.search) {
    const q = options.search.toLowerCase()
    filtered = filtered.filter((e) => e.name.toLowerCase().includes(q))
  }
  if (options.muscle && options.muscle !== 'All') {
    filtered = filtered.filter((e) => e.muscle.toLowerCase() === options.muscle!.toLowerCase())
  }
  if (options.bodyPart && options.bodyPart !== 'All') {
    const bp = options.bodyPart.toLowerCase()
    filtered = filtered.filter((e) => e.bodyParts.some((p) => p.toLowerCase() === bp))
  }
  if (options.target && options.target !== 'All') {
    const t = options.target.toLowerCase()
    filtered = filtered.filter((e) => e.targetMuscles.some((m) => m.toLowerCase() === t))
  }
  if (options.equipment && options.equipment !== 'All') {
    const eq = options.equipment.toLowerCase()
    filtered = filtered.filter((e) => e.equipment.toLowerCase() === eq)
  }

  const limit = Math.min(100, Math.max(1, options.limit ?? 24))
  const page = Math.max(1, options.page ?? 1)
  const paged = paginate(filtered, page, limit)

  return {
    exercises: paged.items,
    total: paged.total,
    page: paged.page,
    limit: paged.limit,
    totalPages: paged.totalPages,
    ...(options.includeMeta ? { meta } : {}),
  }
}

export async function fetchExercises(options?: {
  limit?: number
  search?: string
  muscle?: string
}): Promise<LibraryExercise[]> {
  const result = await queryExercises({
    search: options?.search,
    muscle: options?.muscle,
    limit: options?.limit ?? 60,
    page: 1,
  })
  return result.exercises.length > 0 ? result.exercises : FALLBACK_EXERCISES
}

export async function fetchExerciseById(id: string): Promise<LibraryExercise | null> {
  const { exercises } = await getExerciseCatalog()
  const cached = exercises.find((e) => e.id === id)
  if (cached) return cached

  try {
    const json = await fetchJson<{ data?: Parameters<typeof mapExercise>[0] }>(
      `${EXERCISEDB_BASE}/exercises/${encodeURIComponent(id)}`,
    )
    if (!json.data) return null
    return mapExercise(json.data)
  } catch {
    return null
  }
}

export { FALLBACK_EXERCISES }
