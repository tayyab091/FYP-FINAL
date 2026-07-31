'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Wrench, ChevronDown, ChevronUp, Search, X, Filter } from 'lucide-react'
import { FitnessBadge } from '@/components/motion/FitnessBadge'
import { FadeIn } from '@/components/motion'
import { EmptyState } from '@/components/shared/EmptyState'
import { CatalogImageFrame } from '@/components/shared/CatalogImageFrame'
import { ExpandableCardPanel } from '@/components/shared/ExpandableCardPanel'
import { ExerciseMoreInfoPanel } from '@/components/exercise/ExerciseMoreInfoPanel'
import { easeTransition } from '@/lib/motion'

interface Exercise {
  id: string
  name: string
  muscle: string
  equipment: string
  difficulty: string
  gifUrl: string
  instructions: string
  sets: number | string
  reps: string
  bodyParts?: string[]
  targetMuscles?: string[]
}

interface ExerciseMeta {
  bodyParts: string[]
  targetMuscles: string[]
  equipment: string[]
  muscles: string[]
  total: number
}

interface Filters {
  muscle: string
  bodyPart: string
  target: string
  equipment: string
  search: string
}

const DEFAULT_FILTERS: Filters = {
  muscle: 'All',
  bodyPart: 'All',
  target: 'All',
  equipment: 'All',
  search: '',
}

const BODY_PARTS = [
  { label: 'All', value: '' },
  { label: '💪 Upper Body', value: 'upper' },
  { label: '🦵 Lower Body', value: 'lower' },
  { label: '🎯 Core', value: 'core' },
  { label: '🏃 Cardio', value: 'cardio' },
  { label: '🔄 Full Body', value: 'full' },
]

const BODY_PART_MUSCLES: Record<string, string[]> = {
  upper: ['Chest', 'Back', 'Shoulders', 'Arms'],
  lower: ['Legs'],
  core: ['Core'],
  cardio: ['Cardio'],
  full: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'],
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  Intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const MUSCLE_COLORS: Record<string, string> = {
  Chest: 'bg-blue-500/20 text-blue-400',
  Back: 'bg-purple-500/20 text-purple-400',
  Legs: 'bg-orange-500/20 text-orange-400',
  Shoulders: 'bg-cyan-500/20 text-cyan-400',
  Arms: 'bg-pink-500/20 text-pink-400',
  Core: 'bg-primary/20 text-primary',
  Cardio: 'bg-red-500/20 text-red-400',
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={easeTransition}
      className="elite-panel interactive-lift card-athletic flex h-full flex-col rounded-2xl overflow-hidden"
    >
      <Link href={`/exercises/${exercise.id}`} className="block">
        <CatalogImageFrame
          src={exercise.gifUrl}
          alt={`${exercise.name} — ${exercise.muscle} exercise demo`}
          variant="card"
          fit="contain"
          hasError={imgError}
          onError={() => setImgError(true)}
          fallback={
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Dumbbell className="size-10 mb-2 text-primary/60" />
              <p className="text-xs">{exercise.name}</p>
            </div>
          }
          badge={
            <div className="absolute top-2 right-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DIFFICULTY_COLORS[exercise.difficulty] || ''}`}>
                {exercise.difficulty}
              </span>
            </div>
          }
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between mb-2 gap-2">
          <Link href={`/exercises/${exercise.id}`} className="font-bold text-white leading-tight hover:text-primary transition-colors">
            {exercise.name}
          </Link>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${MUSCLE_COLORS[exercise.muscle] || 'bg-muted text-muted-foreground'}`}>
            {exercise.muscle}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Wrench className="size-3" /> {exercise.equipment}
          </span>
          {exercise.targetMuscles?.[0] && (
            <span className="rounded-full bg-white/5 px-2 py-0.5">{titleCase(exercise.targetMuscles[0])}</span>
          )}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <FitnessBadge variant="sets">{exercise.sets} sets</FitnessBadge>
          <FitnessBadge variant="reps">{exercise.reps}</FitnessBadge>
        </div>

        <Link
          href={`/exercises/${exercise.id}`}
          className="mt-2 inline-block text-xs text-primary hover:text-primary/80 font-medium"
        >
          View full details →
        </Link>

        <button
          onClick={() => setExpanded(!expanded)}
          className={`mt-2 flex w-full items-center gap-1 text-left text-xs font-medium transition-colors ${
            expanded
              ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]'
              : 'text-primary hover:text-primary/80'
          }`}
        >
          {expanded ? <><ChevronUp className="size-3" /> Hide instructions</> : <><ChevronDown className="size-3" /> View instructions</>}
        </button>

        {expanded && (
          <ExpandableCardPanel variant="exercise">
            <ExerciseMoreInfoPanel exercise={exercise} />
          </ExpandableCardPanel>
        )}
      </div>
    </motion.div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-[140px] flex-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-white/[.09] bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-primary/40"
      >
        <option value="All">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{titleCase(opt)}</option>
        ))}
      </select>
    </label>
  )
}

export default function ExercisesPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [bodyPartCategory, setBodyPartCategory] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [meta, setMeta] = useState<ExerciseMeta | null>(null)
  const [total, setTotal] = useState(0)
  const [catalogTotal, setCatalogTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300)
    return () => clearTimeout(t)
  }, [filters.search])

  const selectBodyPart = (value: string) => {
    setBodyPartCategory(value)
    if (!value || value === 'full') {
      setFilters((f) => ({ ...f, muscle: 'All' }))
      return
    }
    const muscles = BODY_PART_MUSCLES[value] || []
    setFilters((f) => ({ ...f, muscle: muscles[0] || 'All' }))
  }

  const filteredExercises = useMemo(() => {
    if (!bodyPartCategory || bodyPartCategory === 'full') return exercises
    const allowed = BODY_PART_MUSCLES[bodyPartCategory] || []
    if (!allowed.length) return exercises
    return exercises.filter((ex) => allowed.includes(ex.muscle))
  }, [exercises, bodyPartCategory])

  const buildQuery = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams({ page: String(pageNum), limit: '24' })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filters.muscle !== 'All') params.set('muscle', filters.muscle)
      if (filters.bodyPart !== 'All') params.set('bodyPart', filters.bodyPart)
      if (filters.target !== 'All') params.set('target', filters.target)
      if (filters.equipment !== 'All') params.set('equipment', filters.equipment)
      return params.toString()
    },
    [debouncedSearch, filters],
  )

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setPage(1)

    fetch(`/api/exercises?meta=true&${buildQuery(1)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setExercises(data.exercises || [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
        if (data.meta) {
          setMeta(data.meta)
          setCatalogTotal(data.meta.total ?? data.total ?? 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [buildQuery])

  const loadMore = async () => {
    if (page >= totalPages || loadingMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const res = await fetch(`/api/exercises?${buildQuery(nextPage)}`)
      if (res.ok) {
        const data = await res.json()
        setExercises((prev) => [...prev, ...(data.exercises || [])])
        setPage(nextPage)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const activeFilters = useMemo(() => {
    const chips: { key: keyof Filters; label: string; value: string }[] = []
    if (filters.muscle !== 'All') chips.push({ key: 'muscle', label: 'Muscle', value: filters.muscle })
    if (filters.bodyPart !== 'All') chips.push({ key: 'bodyPart', label: 'Body part', value: titleCase(filters.bodyPart) })
    if (filters.target !== 'All') chips.push({ key: 'target', label: 'Target', value: titleCase(filters.target) })
    if (filters.equipment !== 'All') chips.push({ key: 'equipment', label: 'Equipment', value: filters.equipment })
    if (debouncedSearch) chips.push({ key: 'search', label: 'Search', value: debouncedSearch })
    return chips
  }, [filters, debouncedSearch])

  const clearFilters = () => setFilters(DEFAULT_FILTERS)

  const removeFilter = (key: keyof Filters) => {
    setFilters((prev) => ({ ...prev, [key]: key === 'search' ? '' : 'All' }))
  }

  return (
    <div className="min-h-screen pt-8 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="page-hero mb-6 px-6 py-10 sm:px-10 md:py-14 gym-floor min-h-[14rem] md:min-h-[16rem]">
            <p className="eyebrow mb-3">Exercise Library</p>
            <h1 className="display-title text-4xl md:text-6xl text-white mb-3">Master Every Movement</h1>
            <p className="max-w-xl text-muted-foreground">
              {catalogTotal > 0
                ? `${catalogTotal.toLocaleString()} exercises with GIF demos — filter by muscle, body part, equipment, and more.`
                : 'Clear demonstrations and technique cues for safer, stronger training.'}
            </p>
            <p className="workout-label mt-3 text-primary/70">SETS · REPS · FORM</p>
          </div>
        </FadeIn>

        <div className="elite-panel mb-6 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="size-4 text-primary" />
            <span className="font-medium text-white">Filters</span>
            {!loading && (
              <span className="ml-auto text-xs">
                Showing <span className="text-primary font-semibold">{filteredExercises.length.toLocaleString()}</span>
                {catalogTotal > 0 && <> of {catalogTotal.toLocaleString()} exercises</>}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {BODY_PARTS.map((bp) => {
              const display = bp.value === '' ? 'All'
                : bp.value === 'upper' ? 'Upper Body'
                : bp.value === 'lower' ? 'Lower Body'
                : bp.value === 'core' ? 'Core'
                : bp.value === 'cardio' ? 'Cardio'
                : 'Full Body'
              return (
                <button
                  key={bp.label}
                  type="button"
                  onClick={() => selectBodyPart(bp.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    bodyPartCategory === bp.value
                      ? 'border-primary/40 bg-primary/15 text-primary filter-pill-active'
                      : 'border-white/10 text-muted-foreground hover:border-primary/30 hover:text-white'
                  }`}
                >
                  {display}
                </button>
              )
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search exercises by name..."
              className="w-full rounded-xl border border-white/[.09] bg-black/25 pl-11 pr-5 py-3.5 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-3 focus:ring-primary/10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Muscle group"
              value={filters.muscle}
              options={meta?.muscles || ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio']}
              onChange={(v) => setFilters((f) => ({ ...f, muscle: v }))}
            />
            <FilterSelect
              label="Body part"
              value={filters.bodyPart}
              options={meta?.bodyParts || []}
              onChange={(v) => setFilters((f) => ({ ...f, bodyPart: v }))}
            />
            <FilterSelect
              label="Target muscle"
              value={filters.target}
              options={meta?.targetMuscles || []}
              onChange={(v) => setFilters((f) => ({ ...f, target: v }))}
            />
            <FilterSelect
              label="Equipment"
              value={filters.equipment}
              options={meta?.equipment || []}
              onChange={(v) => setFilters((f) => ({ ...f, equipment: v }))}
            />
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {activeFilters.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => removeFilter(chip.key)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  {chip.label}: {chip.value}
                  <X className="size-3" />
                </button>
              ))}
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-white underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden">
                <div className="h-48 skeleton" />
                <div className="p-4 space-y-3">
                  <div className="h-4 skeleton w-3/4" />
                  <div className="h-3 skeleton w-1/2" />
                  <div className="h-8 skeleton rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : exercises.length > 0 ? (
          <>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`${filters.muscle}-${filters.bodyPart}-${filters.target}-${filters.equipment}-${debouncedSearch}`}
                layout
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr"
              >
                {filteredExercises.map((e) => (
                  <ExerciseCard key={e.id} exercise={e} />
                ))}
              </motion.div>
            </AnimatePresence>

            {page < totalPages && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="btn-accent px-8 py-3 text-sm font-bold disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : `Load more (${exercises.length} of ${total})`}
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<Search className="size-7" />}
            tagline="No matches"
            title="No exercises found"
            description="Try a different search or filter combination"
          />
        )}
      </div>
    </div>
  )
}
