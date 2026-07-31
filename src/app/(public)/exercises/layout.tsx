import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: 'Exercise Library',
  description:
    'Browse 1,500+ exercises with animated GIF demos. Filter by muscle group, equipment, and difficulty for safer, stronger training.',
  path: '/exercises',
  keywords: ['exercise library', 'workout demos', 'GIF exercises', 'muscle group workouts'],
})

export default function ExercisesLayout({ children }: { children: React.ReactNode }) {
  return children
}
