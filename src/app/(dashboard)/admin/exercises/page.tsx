'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Dumbbell, Search, ExternalLink, Filter } from 'lucide-react'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { StatCard } from '@/components/shared/StatCard'
import { StaggerChildren } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

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

export default function AdminExercisesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [meta, setMeta] = useState<ExerciseMeta | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
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
    if (!user || !['admin', 'super_admin'].includes(user.role)) return
    setLoading(true)
    setPage(1)

    fetch(`/api/exercises?meta=true&${buildQuery(1)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setExercises(data.exercises || [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
        if (data.meta) setMeta(data.meta)
      })
      .finally(() => setLoading(false))
  }, [user, buildQuery])

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

  if (authLoading) return <PageLoader />
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <AccessGate
        icon={Shield}
        title="Admin access only"
        description="Exercise library management is restricted to platform administrators."
      />
    )
  }

  const catalogTotal = meta?.total ?? total
  const muscleCounts = meta?.muscles.length ?? 0

  return (
    <div className="min-h-screen px-4 pb-12 pt-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="page-hero mb-6 px-6 py-8 sm:px-8">
          <p className="eyebrow mb-2">Content oversight</p>
          <h1 className="display-title text-3xl md:text-4xl">Exercise Library</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Browse the full live exercise catalog powered by ExerciseDB ({catalogTotal.toLocaleString()} exercises).
            Audit content quality, muscle coverage, and equipment diversity.
          </p>
          <p className="workout-label mt-3 text-primary/60">Admin view · ExerciseDB proxy</p>
        </div>

        <StaggerChildren className="dashboard-grid cols-4 mb-8">
          <StatCard label="Total Exercises" value={catalogTotal} icon={Dumbbell} variant="primary" />
          <StatCard label="Muscle Groups" value={muscleCounts} icon={Search} variant="sky" />
          <StatCard label="Body Parts" value={meta?.bodyParts.length ?? 0} variant="amber" hint="Filter dimensions" />
          <StatCard label="Equipment Types" value={meta?.equipment.length ?? 0} variant="rose" hint="Filter dimensions" />
        </StaggerChildren>

        <div className="elite-panel mb-6 space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="size-4 text-primary" />
            <span className="font-medium text-white">Catalog filters</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Showing {total.toLocaleString()} of {catalogTotal.toLocaleString()}
            </span>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises by name..."
            className="w-full rounded-xl border border-white/[.09] bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-primary/40"
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              className="min-w-[160px] flex-1 rounded-xl border border-white/[.09] bg-black/25 px-3 py-2.5 text-sm text-white outline-none"
            >
              <option value="All">All body parts</option>
              {(meta?.bodyParts || []).map((bp) => (
                <option key={bp} value={bp}>{bp}</option>
              ))}
            </select>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="min-w-[160px] flex-1 rounded-xl border border-white/[.09] bg-black/25 px-3 py-2.5 text-sm text-white outline-none"
            >
              <option value="All">All equipment</option>
              {(meta?.equipment || []).map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>
        </div>

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
                  href={`/exercises/${exercise.id}`}
                  className="elite-panel card-athletic flex h-full flex-col overflow-hidden rounded-2xl hover:border-primary/30 transition-colors"
                >
                  <div className="relative h-40 bg-card">
                    {exercise.gifUrl ? (
                      <Image src={exercise.gifUrl} alt={exercise.name} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Dumbbell className="size-8 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-bold text-white">{exercise.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge className="bg-primary/10 text-primary text-xs">{exercise.muscle}</Badge>
                      <Badge variant="outline" className="border-border text-xs">{exercise.equipment}</Badge>
                      {exercise.targetMuscles?.[0] && (
                        <Badge variant="outline" className="border-border text-xs">{exercise.targetMuscles[0]}</Badge>
                      )}
                    </div>
                    <p className="mt-auto pt-3 text-xs text-muted-foreground">ID: {exercise.id}</p>
                  </div>
                </Link>
              ))}
            </div>

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
        )}

        <div className="mt-8 text-center">
          <Link href="/exercises" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            Preview public exercise page <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
