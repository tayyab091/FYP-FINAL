import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: 'Nutrition & Meal Recipes',
  description:
    'Explore healthy meal ideas, macro-friendly recipes, and nutrition guides to fuel your fitness goals.',
  path: '/nutrition',
  keywords: ['meal recipes', 'nutrition guide', 'healthy eating', 'macro tracking'],
})

export default function NutritionLayout({ children }: { children: React.ReactNode }) {
  return children
}
