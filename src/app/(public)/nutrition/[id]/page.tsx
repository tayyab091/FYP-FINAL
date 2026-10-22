import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { permanentRedirect } from 'next/navigation'
import { getMealById } from '@/lib/meals'
import { mealDetailPath, mealSlug, parseMealId } from '@/lib/meal-slug'
import { buildPageMetadata } from '@/lib/seo'
import { MealDetailView } from './MealDetailView'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: raw } = await params
  const mealId = parseMealId(raw)
  const meal = await getMealById(mealId)

  if (!meal) {
    return buildPageMetadata({
      title: 'Recipe Not Found',
      description: 'This recipe could not be found. Browse healthy meal ideas on T.E.S.T.',
      path: `/nutrition/${raw}`,
      noIndex: true,
    })
  }

  const path = mealDetailPath(meal.name, meal.id)
  const description = `${meal.name} — ${meal.category} recipe from ${meal.area}. Ingredients, instructions, and nutrition inspiration on T.E.S.T.`

  return buildPageMetadata({
    title: `${meal.name} — ${meal.category} Recipe`,
    description,
    path,
    ogImage: meal.thumb || undefined,
    keywords: [meal.name, meal.category, meal.area, 'healthy recipe'],
  })
}

function MealNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-8 pb-24">
      <div className="text-center">
        <h1 className="mb-4 text-xl font-bold text-foreground">Recipe not found</h1>
        <Link href="/nutrition" className="inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to nutrition
        </Link>
      </div>
    </div>
  )
}

export default async function MealDetailPage({ params }: PageProps) {
  const { id: raw } = await params
  const mealId = parseMealId(raw)
  const meal = await getMealById(mealId)

  if (!meal) {
    return <MealNotFound />
  }

  const canonicalSlug = mealSlug(meal.name, meal.id)
  const willRedirect = raw !== canonicalSlug

  if (willRedirect) {
    permanentRedirect(`/nutrition/${canonicalSlug}`)
  }

  return <MealDetailView meal={meal} />
}
