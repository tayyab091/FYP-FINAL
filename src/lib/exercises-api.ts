import { getCached, getOrFetch, paginate } from '@/lib/server-cache'

const EXERCISEDB_BASE = 'https://oss.exercisedb.dev/api/v1'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const PAGE_SIZE = 25
const PAGE_DELAY_MS = 80
const GIF_HEAD_BATCH = 12
const GIF_HEAD_TIMEOUT_MS = 4000

const VALID_GIF_HOSTS = [
  'static.exercisedb.dev',
  'upload.wikimedia.org',
  'media1.tenor.com',
  'res.cloudinary.com',
]

let lastFilteredRemovedCount = 0

export function getLastFilteredRemovedCount(): number {
  return lastFilteredRemovedCount
}

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

function looksLikeValidGifUrl(url: string): boolean {
  if (!url?.trim()) return false
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== 'https:') return false
    const hostOk = VALID_GIF_HOSTS.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`),
    )
    if (!hostOk) return false
    return (
      /\.(gif|webp|png|jpg|jpeg)$/i.test(parsed.pathname) ||
      parsed.pathname.includes('/media/')
    )
  } catch {
    return false
  }
}

async function gifUrlLoads(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GIF_HEAD_TIMEOUT_MS)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    clearTimeout(timeout)
    if (res.ok) return true
    if (res.status === 405 || res.status === 403) {
      const getRes = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal: controller.signal,
        next: { revalidate: 86400 },
      })
      return getRes.ok
    }
    return false
  } catch {
    return false
  }
}

function filterExercisesByPattern(exercises: LibraryExercise[]): LibraryExercise[] {
  const valid = exercises.filter((e) => looksLikeValidGifUrl(e.gifUrl))
  lastFilteredRemovedCount = exercises.length - valid.length
  return valid.length > 0 ? valid : FALLBACK_EXERCISES
}

function exerciseFiltersActive(options: {
  search?: string
  muscle?: string
  bodyPart?: string
  target?: string
  equipment?: string
}): boolean {
  return !!(
    options.search?.trim() ||
    (options.muscle && options.muscle !== 'All') ||
    (options.bodyPart && options.bodyPart !== 'All') ||
    (options.target && options.target !== 'All') ||
    (options.equipment && options.equipment !== 'All')
  )
}

function applyExerciseFilters(
  catalog: ExerciseCatalog,
  options: {
    search?: string
    muscle?: string
    bodyPart?: string
    target?: string
    equipment?: string
    page?: number
    limit?: number
    includeMeta?: boolean
  },
): ExerciseQueryResult {
  let filtered = catalog.exercises

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
    ...(options.includeMeta ? { meta: catalog.meta } : {}),
  }
}

async function fetchExercisePages(maxPages: number): Promise<LibraryExercise[]> {
  const exercises: LibraryExercise[] = []
  let cursor: string | null = null

  for (let page = 0; page < maxPages; page++) {
    const url: string = cursor
      ? `${EXERCISEDB_BASE}/exercises?limit=${PAGE_SIZE}&after=${encodeURIComponent(cursor)}`
      : `${EXERCISEDB_BASE}/exercises?limit=${PAGE_SIZE}`

    const json = await fetchJson<{
      data?: Parameters<typeof mapExercise>[0][]
      meta?: { hasNextPage?: boolean; nextCursor?: string }
    }>(url)

    exercises.push(...(json.data || []).map(mapExercise))
    if (!json.meta?.hasNextPage || !json.meta.nextCursor) break
    cursor = json.meta.nextCursor
    if (page < maxPages - 1) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS))
  }

  return exercises
}

function warmExerciseCatalog(): void {
  if (getCached<ExerciseCatalog>('exercise-catalog-v4')) return
  void getExerciseCatalog()
}

function buildMetaFromLists(
  exercises: LibraryExercise[],
  lists: { bodyParts: string[]; equipment: string[]; muscles: string[] },
  estimatedTotal?: number,
): ExerciseCatalogMeta {
  const meta = buildMeta(exercises)
  if (lists.bodyParts.length) meta.bodyParts = uniqueSorted(lists.bodyParts)
  if (lists.equipment.length) {
    meta.equipment = uniqueSorted([...meta.equipment, ...lists.equipment])
  }
  if (lists.muscles.length) meta.muscles = uniqueSorted(lists.muscles)
  if (estimatedTotal && estimatedTotal > meta.total) meta.total = estimatedTotal
  return meta
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
  return getOrFetch('exercise-catalog-v4', CACHE_TTL, async () => {
    try {
      const raw = await fetchAllExercisesFromApi()
      const exercises = filterExercisesByPattern(raw)
      const lists = await fetchFilterLists()
      const meta = buildMetaFromLists(exercises, lists)
      return { exercises, meta }
    } catch {
      const exercises = FALLBACK_EXERCISES
      return { exercises, meta: buildMeta(exercises) }
    }
  })
}

async function queryExercisesFast(options: {
  search?: string
  muscle?: string
  bodyPart?: string
  target?: string
  equipment?: string
  page?: number
  limit?: number
  includeMeta?: boolean
}): Promise<ExerciseQueryResult> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 24))
  const page = Math.max(1, options.page ?? 1)
  const lists = await fetchFilterLists()
  warmExerciseCatalog()

  const previewPages = exerciseFiltersActive(options) ? Math.min(20, page + 2) : Math.max(1, Math.ceil((page * limit) / PAGE_SIZE))
  const raw = await fetchExercisePages(previewPages)
  const exercises = filterExercisesByPattern(raw)
  const meta = buildMetaFromLists(exercises, lists, exercises.length < raw.length ? undefined : raw.length)

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

  const paged = paginate(filtered, page, limit)

  return {
    exercises: paged.items.length > 0 ? paged.items : FALLBACK_EXERCISES,
    total: paged.total,
    page: paged.page,
    limit: paged.limit,
    totalPages: paged.totalPages,
    ...(options.includeMeta ? { meta } : {}),
  }
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
  const cached = getCached<ExerciseCatalog>('exercise-catalog-v4')
  if (cached) return applyExerciseFilters(cached, options)
  return queryExercisesFast(options)
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
    const exercise = mapExercise(json.data)
    if (!looksLikeValidGifUrl(exercise.gifUrl)) return null
    return exercise
  } catch {
    return null
  }
}

export { FALLBACK_EXERCISES }
