'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Apple,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  Filter,
  Globe,
  Search,
  UtensilsCrossed,
} from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { CatalogImageFrame } from '@/components/shared/CatalogImageFrame'
import { ExpandableCardPanel } from '@/components/shared/ExpandableCardPanel'
import { DishMoreInfoPanel } from '@/components/nutrition/DishMoreInfoPanel'
import { mealDetailPath } from '@/lib/meal-slug'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface MealItem {
  id: string
  name: string
  category?: string
  area?: string
  thumb?: string
  tags?: string
}

interface MealDetail extends MealItem {
  instructions: string
  ingredients: { name: string; measure: string }[]
  youtube?: string
}

interface MealMeta {
  categories: string[]
  areas: string[]
  total: number
}

interface TrainerMealPlan {
  _id: string
  title: string
  goal?: string
  userId?: { fullName?: string; email?: string }
}

interface RoleNutritionLibraryProps {
  eyebrow: string
  title: string
  description: string
  publicPreviewHref?: string
  showTrainerPlans?: boolean
}

export function RoleNutritionLibrary({
  eyebrow,
  title,
  description,
  publicPreviewHref = '/nutrition',
  showTrainerPlans = false,
}: RoleNutritionLibraryProps) {
  const [meals, setMeals] = useState<MealItem[]>([])
  const [meta, setMeta] = useState<MealMeta | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [area, setArea] = useState('All')
  const [letter, setLetter] = useState('All')
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [mealDetails, setMealDetails] = useState<Record<string, MealDetail>>({})
  const [trainerPlans, setTrainerPlans] = useState<TrainerMealPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/meals?categories=true').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/meals?areas=true').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([categoriesData, areasData]) => {
        if (cancelled) return
        setMeta((prev) => ({
          categories: categoriesData?.categories || prev?.categories || [],
          areas: areasData?.areas || prev?.areas || [],
          total: prev?.total ?? 0,
        }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!showTrainerPlans) return
    setPlansLoading(true)
    fetch('/api/meal-plans', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTrainerPlans(Array.isArray(data) ? data : []))
      .catch(() => setTrainerPlans([]))
      .finally(() => setPlansLoading(false))
  }, [showTrainerPlans])

  const buildQuery = useCallback(
    (pageNum: number, withMeta = false) => {
      const params = new URLSearchParams({ page: String(pageNum), limit: '24' })
      if (withMeta) params.set('meta', 'true')
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (category !== 'All') params.set('category', category)
      if (area !== 'All') params.set('area', area)
      if (letter !== 'All') params.set('letter', letter)
      return params.toString()
    },
    [debouncedSearch, category, area, letter],
  )

  useEffect(() => {
    const controller = new AbortController()
    setFetchError(null)
    setLoading(true)
    setPage(1)

    fetch(`/api/meals?${buildQuery(1, true)}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load meals (${r.status})`)
        return r.json()
      })
      .then((data) => {
        if (controller.signal.aborted) return
        setMeals(data.meals || [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
        setPage(data.page ?? 1)
        if (data.meta) {
          setMeta((prev) => ({
            categories: data.meta.categories?.length ? data.meta.categories : prev?.categories || [],
            areas: data.meta.areas?.length ? data.meta.areas : prev?.areas || [],
            total: data.meta.total ?? data.total ?? prev?.total ?? 0,
          }))
        }
        // #region agent log
        fetch('http://127.0.0.1:7893/ingest/3b5841b0-46ed-4652-9b9f-279e38a5ba27',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1483ff'},body:JSON.stringify({sessionId:'1483ff',hypothesisId:'H2',location:'RoleNutritionLibrary.tsx:fetch',message:'meals applied to UI',data:{count:(data.meals||[]).length,total:data.total,category,area,letter},timestamp:Date.now(),runId:'post-fix'})}).catch(()=>{});
        // #endregion
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) return
        setMeals([])
        setFetchError(err.message || 'Failed to load meal catalog')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [buildQuery, category, area, letter])

  const retryLoad = () => {
    setFetchError(null)
    setLoading(true)
    fetch(`/api/meals?${buildQuery(1, true)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Failed (${r.status})`))))
      .then((data) => {
        setMeals(data.meals || [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
        setPage(data.page ?? 1)
        if (data.meta) {
          setMeta((prev) => ({
            categories: data.meta.categories?.length ? data.meta.categories : prev?.categories || [],
            areas: data.meta.areas?.length ? data.meta.areas : prev?.areas || [],
            total: data.meta.total ?? data.total ?? prev?.total ?? 0,
          }))
        }
      })
      .catch((err: Error) => setFetchError(err.message || 'Failed to load meal catalog'))
      .finally(() => setLoading(false))
  }

  const loadMore = async () => {
    if (page >= totalPages || loadingMore || loading) return
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const res = await fetch(`/api/meals?${buildQuery(nextPage, false)}`)
      if (!res.ok) throw new Error('Failed to load more meals')
      const data = await res.json()
      setMeals((prev) => {
        const seen = new Set(prev.map((meal) => meal.id))
        const next = (data.meals || []).filter((meal: MealItem) => meal.id && !seen.has(meal.id))
        return [...prev, ...next]
      })
      setPage(data.page ?? nextPage)
      setTotal(data.total ?? total)
      setTotalPages(data.totalPages ?? totalPages)
    } catch {
      setFetchError('Failed to load more meals')
    } finally {
      setLoadingMore(false)
    }
  }

  const toggleMeal = async (id: string) => {
    if (expandedMeal === id) {
      setExpandedMeal(null)
      return
    }
    setExpandedMeal(id)
    if (mealDetails[id]) return
    try {
      const res = await fetch(`/api/meals?id=${encodeURIComponent(id)}`)
      if (!res.ok) return
      const detail = (await res.json()) as MealDetail
      setMealDetails((prev) => ({ ...prev, [id]: detail }))
    } catch {
      /* ignore */
    }
  }

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setCategory('All')
    setArea('All')
    setLetter('All')
  }

  const hasFilters =
    debouncedSearch || category !== 'All' || area !== 'All' || letter !== 'All'

  const catalogTotal = meta?.total ?? total

  return (
    <div className="min-h-screen px-4 pb-12 pt-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="page-hero mb-6 px-6 py-8 sm:px-8">
          <p className="eyebrow mb-2">{eyebrow}</p>
          <h1 className="display-title text-3xl md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
          <p className="workout-label mt-3 text-primary/60">Live meal catalog · TheMealDB</p>
        </div>

        {showTrainerPlans && (
          <div className="elite-panel mb-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Assigned meal plans</p>
                <p className="text-xs text-muted-foreground">
                  {plansLoading
                    ? 'Loading your client plans…'
                    : trainerPlans.length === 0
                      ? 'No plans assigned yet — create one from the trainer dashboard.'
                      : `${trainerPlans.length} plan${trainerPlans.length === 1 ? '' : 's'} assigned to clients`}
                </p>
              </div>
              <Link
                href="/meal-plans"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15"
              >
                <ClipboardList className="size-4" />
                Manage plans
              </Link>
            </div>
            {!plansLoading && trainerPlans.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {trainerPlans.slice(0, 6).map((plan) => (
                  <div key={plan._id} className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-foreground">{plan.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {plan.userId?.fullName || plan.userId?.email || 'Client'} · {plan.goal?.replace(/_/g, ' ') || 'general'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="dashboard-grid cols-4 mb-8">
          <StatCard label="Total Meals" value={loading ? '—' : catalogTotal} icon={Apple} variant="primary" animate={!loading} />
          <StatCard label="Categories" value={loading ? '—' : (meta?.categories.length ?? 0)} icon={Search} variant="sky" animate={!loading} />
          <StatCard label="Cuisines" value={loading ? '—' : (meta?.areas.length ?? 0)} variant="amber" hint="Filter dimensions" animate={!loading} />
          <StatCard label="Showing" value={loading ? '—' : total} variant="rose" hint="Matched results" animate={!loading} />
        </div>

        <div className="elite-panel mb-6 space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="size-4 text-primary" />
            <span className="font-medium text-foreground">Meal filters</span>
            {!loading && (
              <span className="ml-auto text-xs text-muted-foreground">
                Showing {total.toLocaleString()} of {catalogTotal.toLocaleString()}
              </span>
            )}
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
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setLetter('All')}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                letter === 'All' ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              All
            </button>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setLetter(ch)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  letter === ch ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-primary/25'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>

        {fetchError && (
          <div className="elite-panel mb-6 border border-red-500/30 bg-red-500/5 p-4 text-center">
            <p className="text-sm text-red-400">{fetchError}</p>
            <button
              type="button"
              onClick={retryLoad}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading && meals.length === 0 ? (
          <div className="dashboard-grid cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl bg-muted" />
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="elite-panel p-8 text-center">
            <UtensilsCrossed className="mx-auto mb-3 size-8 text-primary/50" />
            <p className="text-foreground font-medium">No meals match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different category, cuisine, or search term.</p>
          </div>
        ) : (
          <>
            {loading && (
              <p className="mb-3 text-center text-xs text-muted-foreground">Updating results…</p>
            )}
            <div className={`dashboard-grid cols-3 ${loading ? 'opacity-60' : ''}`}>
              {meals.map((meal) => {
                const detail = mealDetails[meal.id]
                const isOpen = expandedMeal === meal.id
                return (
                  <div
                    key={meal.id}
                    className="elite-panel card-athletic flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl"
                  >
                    <Link href={mealDetailPath(meal.name, meal.id)} className="block">
                      <CatalogImageFrame
                        src={meal.thumb || ''}
                        alt={meal.name}
                        variant="card"
                        fit="cover"
                        fallback={
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Apple className="size-8 text-primary/50" />
                          </div>
                        }
                        badge={
                          meal.category ? (
                            <span className="absolute left-3 top-3 rounded-full border border-border bg-background/85 px-2 py-0.5 text-[10px] font-bold text-foreground backdrop-blur">
                              {meal.category}
                            </span>
                          ) : undefined
                        }
                      />
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <Link
                        href={mealDetailPath(meal.name, meal.id)}
                        className="font-bold text-foreground leading-tight hover:text-primary transition-colors"
                      >
                        {meal.name}
                      </Link>
                      {meal.area && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Globe className="size-3" />
                          {meal.area}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {meal.category && (
                          <Badge className="bg-primary/10 text-xs text-primary">{meal.category}</Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleMeal(meal.id)}
                        className={`mt-3 flex items-center gap-1 text-xs font-medium transition-colors ${
                          isOpen ? 'text-primary' : 'text-primary/80 hover:text-primary'
                        }`}
                      >
                        {isOpen ? (
                          <>
                            <ChevronUp className="size-3" /> Hide preview
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3" /> Quick preview
                          </>
                        )}
                      </button>
                      {isOpen && (
                        <ExpandableCardPanel loading={!detail} variant="nutrition">
                          {detail && (
                            <DishMoreInfoPanel
                              dish={{
                                id: detail.id,
                                name: detail.name,
                                category: detail.category || '',
                                area: detail.area || '',
                                thumb: detail.thumb,
                                ingredients: detail.ingredients,
                                instructions: detail.instructions,
                              }}
                            />
                          )}
                        </ExpandableCardPanel>
                      )}
                    </div>
                  </div>
                )
              })}
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
