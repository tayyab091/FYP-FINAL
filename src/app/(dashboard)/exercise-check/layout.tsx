import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Form Checker',
  description:
    'Perfect your squat, push-up, and lunge form with real-time AI pose analysis powered by computer vision.',
  path: '/exercise-check',
  keywords: ['AI form checker', 'pose detection', 'workout form', 'exercise technique'],
})

export default function ExerciseCheckLayout({ children }: { children: React.ReactNode }) {
  return children
}
