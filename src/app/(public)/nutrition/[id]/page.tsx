import type { Metadata } from 'next'
import { getMealById } from '@/lib/meals'
import { buildPageMetadata } from '@/lib/seo'
import MealDetailClient from './MealDetailClient'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const meal = await getMealById(id)

  if (!meal) {
    return buildPageMetadata({
      title: 'Recipe Not Found',
      description: 'This recipe could not be found. Browse healthy meal ideas on T.E.S.T.',
      path: `/nutrition/${id}`,
      noIndex: true,
    })
  }

  const description = `${meal.name} — ${meal.category} recipe from ${meal.area}. Ingredients, instructions, and nutrition inspiration on T.E.S.T.`

  return buildPageMetadata({
    title: `${meal.name} — ${meal.category} Recipe`,
    description,
    path: `/nutrition/${id}`,
    ogImage: meal.thumb || undefined,
    keywords: [meal.name, meal.category, meal.area, 'healthy recipe'],
  })
}

export default function MealDetailPage() {
  return <MealDetailClient />
}
