'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Globe, UtensilsCrossed, Play } from 'lucide-react'
import { PageLoader } from '@/components/shared/PageLoader'
import { FadeIn } from '@/components/motion'

interface MealDetail {
  id: string
  name: string
  category: string
  area: string
  thumb: string
  instructions: string
  youtube?: string
  ingredients: { name: string; measure: string }[]
}

export default function MealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [meal, setMeal] = useState<MealDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/meals?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMeal(data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <PageLoader />

  if (!meal) {
    return (
      <div className="min-h-screen pt-28 pb-24 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-4">Recipe not found</h1>
          <Link href="/nutrition" className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> Back to nutrition
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-28 pb-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/nutrition" className="text-muted-foreground text-sm hover:text-primary mb-6 inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> All recipes
        </Link>

        <FadeIn>
          <div className="elite-panel rounded-2xl overflow-hidden">
            <div className="relative h-56 sm:h-72 bg-card">
              {meal.thumb ? (
                <Image
                  src={meal.thumb}
                  alt={meal.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 896px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-primary/50">
                  <UtensilsCrossed className="size-12" />
                </div>
              )}
              <span className="absolute left-4 top-4 rounded-full border border-primary/20 bg-black/60 px-3 py-1 text-xs font-bold text-primary backdrop-blur">
                {meal.category}
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h1 className="display-title text-3xl md:text-4xl text-white">{meal.name}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="size-4" /> {meal.area}
                </p>
              </div>

              {meal.youtube && (
                <a
                  href={meal.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
                >
                  <Play className="size-4" /> Watch video tutorial
                </a>
              )}

              <div>
                <h2 className="font-bold text-white mb-3">Ingredients</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {meal.ingredients.map((ing) => (
                    <li key={ing.name} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
                      <span className="text-white">{ing.name}</span>
                      {ing.measure ? <span className="text-muted-foreground"> — {ing.measure}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="font-bold text-white mb-3">Instructions</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{meal.instructions}</p>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
