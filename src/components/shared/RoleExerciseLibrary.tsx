'use client'
import { PagePhoto } from '@/components/shared/PagePhoto'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CatalogImageFrame } from '@/components/shared/CatalogImageFrame'
import Link from 'next/link'
import { exerciseDetailPath } from '@/lib/exercise-slug'
import { Dumbbell, ExternalLink, Filter, Search } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { StaggerChildren } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicData } from '@/hooks/usePublicData'
import type { CatalogPage } from '@/lib/public-data-cache'

interface Exercise {
  id: string
  name: string
  muscle: string
  equipment: string
  difficulty: string
  gifUrl: string
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

interface RoleExerciseLibraryProps {
  eyebrow: string
  title: string
  description: string
  publicPreviewHref?: string
}

export function RoleExerciseLibrary({
  eyebrow,
  title,
  description,
  publicPreviewHref = '/exercises',
}: RoleExerciseLibraryProps) {
  const publicData = usePublicData()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [meta, setMeta] = useState<ExerciseMeta | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const requestVersion = useRef(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [bodyPart, setBodyPart] = useState('All')
  const [equipment, setEquipment] = useState('All')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const buildQuery = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams({ page: String(pageNum), limit: '36' })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (bodyPart !== 'All') params.set('bodyPart', bodyPart)
      if (equipment !== 'All') params.set('equipment', equipment)
      return params.toString()
    },
    [debouncedSearch, bodyPart, equipment],
  )

  useEffect(() => {
    const controller = new AbortController()
    requestVersion.current += 1
    setLoading(true)
    setLoadingMore(false)
    setFetchError(null)
    setPage(1)
    publicData<CatalogPage<Exercise, ExerciseMeta>>(`/api/exercises?meta=true&${buildQuery(1)}`, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setExercises(data.exercises || [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
        if (data.meta) setMeta(data.meta)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setExercises([])
        setTotal(0)
        setFetchError('Unable to load exercises. Please try again.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort(); requestVersion.current += 1 }
  }, [buildQuery, retry, publicData])

  const loadMore = async () => {
    if (page >= totalPages || loadingMore || loading) return
    const version = requestVersion.current
    setFetchError(null)
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const data = await publicData<CatalogPage<Exercise, ExerciseMeta>>(`/api/exercises?${buildQuery(nextPage)}`)
      if (version !== requestVersion.current) return
      setExercises((prev) => {
        const seen = new Set(prev.map((exercise) => exercise.id))
        return [...prev, ...(data.exercises || []).filter((exercise: Exercise) => !seen.has(exercise.id))]
      })
      setPage(nextPage)
    } catch {
      if (version === requestVersion.current) setFetchError('Unable to load more exercises. Please try again.')
    } finally {
      if (version === requestVersion.current) setLoadingMore(false)
    }
  }

  const catalogTotal = meta?.total ?? total

  return (
    <div className="min-h-screen px-4 pb-12 pt-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="page-hero fitness-photo-hero mb-6 px-6 py-8 sm:px-8">
            <PagePhoto kind="training" />
          <p className="eyebrow mb-2">{eyebrow}</p>
          <h1 className="display-title text-3xl md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
          <p className="workout-label mt-3 text-primary/60">Exercise catalog · Workspace view</p>
        </div>

        <StaggerChildren className="dashboard-grid cols-4 mb-8">
          <StatCard label="Total Exercises" value={catalogTotal} icon={Dumbbell} variant="primary" />
          <StatCard label="Muscle Groups" value={meta?.muscles.length ?? 0} icon={Search} variant="sky" />
          <StatCard label="Body Parts" value={meta?.bodyParts.length ?? 0} variant="amber" hint="Filter dimensions" />
          <StatCard label="Equipment Types" value={meta?.equipment.length ?? 0} variant="rose" hint="Filter dimensions" />
        </StaggerChildren>

        <div className="elite-panel mb-6 space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="size-4 text-primary" />
            <span className="font-medium text-foreground">Catalog filters</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Showing {total.toLocaleString()} of {catalogTotal.toLocaleString()}
            </span>
          </div>
          <input
            aria-label="Search exercises"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises by name..."
            className="w-full rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
          />
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="Body part"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              className="min-w-[160px] flex-1 rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm text-foreground outline-none"
            >
              <option value="All">All body parts</option>
              {(meta?.bodyParts || []).map((bp) => (
                <option key={bp} value={bp}>
                  {bp}
                </option>
              ))}
            </select>
            <select
              aria-label="Equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="min-w-[160px] flex-1 rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm text-foreground outline-none"
            >
              <option value="All">All equipment</option>
              {(meta?.equipment || []).map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>
        </div>

        {fetchError && <div role="alert" className="elite-panel mb-6 p-5 text-center"><p className="text-sm text-destructive">{fetchError}</p><button type="button" className="mt-3 min-h-10 rounded-lg px-4 text-sm font-semibold text-primary hover:bg-primary/10" onClick={() => exercises.length ? void loadMore() : setRetry((n) => n + 1)}>Retry</button></div>}

        {loading ? (
          <div className="dashboard-grid cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl bg-muted" />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <div className="elite-panel p-8 text-center text-muted-foreground">No exercises match your filters.</div>
        ) : (
          <>
            <div className="dashboard-grid cols-3">
              {exercises.map((exercise) => (
                <Link
                  key={exercise.id}
                  href={exerciseDetailPath(exercise)}
                  className="elite-panel card-athletic flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl transition-colors hover:border-primary/30"
                >
                  <CatalogImageFrame src={exercise.gifUrl} alt={exercise.name} fit="contain" />
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-bold text-foreground">{exercise.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge className="bg-primary/10 text-xs text-primary">{exercise.muscle}</Badge>
                      <Badge variant="outline" className="border-border text-xs">
                        {exercise.equipment}
                      </Badge>
                    </div>
                    <p className="mt-auto pt-3 text-sm font-medium text-primary">View exercise instructions <span aria-hidden="true">→</span></p>
                  </div>
                </Link>
              ))}
            </div>

            {page < totalPages && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="btn-accent px-8 py-3 text-sm font-bold disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : `Load more (${exercises.length} of ${total})`}
                </button>
              </div>
            )}
          </>
        )}

        {publicPreviewHref && (
          <div className="mt-8 text-center">
            <Link href={publicPreviewHref} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              Preview public exercise page <ExternalLink className="size-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
