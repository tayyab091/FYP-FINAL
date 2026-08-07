'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Apple, ExternalLink, Filter, Search } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { StaggerChildren } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface MealItem {
  id: string
  name: string
  category?: string
  area?: string
  thumb?: string
  tags?: string[]
}

interface MealMeta {
  categories: string[]
  areas: string[]
  total: number
}

interface RoleNutritionLibraryProps {
  eyebrow: string
  title: string
  description: string
  publicPreviewHref?: string
}

export function RoleNutritionLibrary({
  eyebrow,
  title,
  description,
  publicPreviewHref = '/nutrition',
}: RoleNutritionLibraryProps) {
  const [meals, setMeals] = useState<MealItem[]>([])
  const [meta, setMeta] = useState<MealMeta | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [area, setArea] = useState('All')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const buildQuery = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams({ page: String(pageNum), limit: '24', meta: 'true' })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (category !== 'All') params.set('category', category)
      if (area !== 'All') params.set('area', area)
      return params.toString()
    },
    [debouncedSearch, category, area],
  )

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetch(`/api/meals?${buildQuery(1)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setMeals(data.meals || [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
        if (data.meta) {
          setMeta({
            categories: data.meta.categories || [],
            areas: data.meta.areas || [],
            total: data.meta.total ?? data.total ?? 0,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [buildQuery])

  const loadMore = async () => {
    if (page >= totalPages || loadingMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const res = await fetch(`/api/meals?${buildQuery(nextPage).replace('meta=true&', '').replace('&meta=true', '').replace('meta=true', '')}`)
      if (res.ok) {
        const data = await res.json()
        setMeals((prev) => [...prev, ...(data.meals || [])])
        setPage(nextPage)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const catalogTotal = meta?.total ?? total

  return (
    <div className="min-h-screen px-4 pb-12 pt-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="page-hero mb-6 px-6 py-8 sm:px-8">
          <p className="eyebrow mb-2">{eyebrow}</p>
          <h1 className="display-title text-3xl md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
          <p className="workout-label mt-3 text-primary/60">Meal catalog · Oversight view</p>
        </div>

        <StaggerChildren className="dashboard-grid cols-4 mb-8">
          <StatCard label="Total Meals" value={catalogTotal} icon={Apple} variant="primary" />
          <StatCard label="Categories" value={meta?.categories.length ?? 0} icon={Search} variant="sky" />
          <StatCard label="Cuisines" value={meta?.areas.length ?? 0} variant="amber" hint="Filter dimensions" />
          <StatCard label="Showing" value={total} variant="rose" hint="Matched results" />
        </StaggerChildren>

        <div className="elite-panel mb-6 space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="size-4 text-primary" />
            <span className="font-medium text-foreground">Meal filters</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Showing {total.toLocaleString()} of {catalogTotal.toLocaleString()}
            </span>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meals by name..."
            className="w-full rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="min-w-[160px] flex-1 rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm text-foreground outline-none"
            >
              <option value="All">All categories</option>
              {(meta?.categories || []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="min-w-[160px] flex-1 rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm text-foreground outline-none"
            >
              <option value="All">All cuisines</option>
              {(meta?.areas || []).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
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
        ) : meals.length === 0 ? (
          <div className="elite-panel p-8 text-center text-muted-foreground">No meals match your filters.</div>
        ) : (
          <>
            <div className="dashboard-grid cols-3">
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className="elite-panel card-athletic flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl"
                >
                  <div className="relative h-40 bg-card">
                    {meal.thumb ? (
                      <Image
                        src={meal.thumb}
                        alt={meal.name}
                        fill
                        sizes="(max-width:768px) 100vw, 33vw"
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Apple className="size-8 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-bold text-foreground">{meal.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {meal.category && (
                        <Badge className="bg-primary/10 text-xs text-primary">{meal.category}</Badge>
                      )}
                      {meal.area && (
                        <Badge variant="outline" className="border-border text-xs">
                          {meal.area}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-auto pt-3 text-xs text-muted-foreground">ID: {meal.id}</p>
                  </div>
                </div>
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
                  {loadingMore ? 'Loading...' : `Load more (${meals.length} of ${total})`}
                </button>
              </div>
            )}
          </>
        )}

        {publicPreviewHref && (
          <div className="mt-8 text-center">
            <Link href={publicPreviewHref} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              Preview public nutrition page <ExternalLink className="size-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
