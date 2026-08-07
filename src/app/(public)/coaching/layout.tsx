import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: 'Find Your Perfect Trainer',
  description:
    'Browse verified fitness coaches across Pakistan and beyond. Filter by specialty, location, and rating to find your ideal personal trainer.',
  path: '/coaching',
  keywords: ['personal trainer', 'fitness coach', 'trainer marketplace', 'Pakistan trainer'],
})

export default function CoachingLayout({ children }: { children: React.ReactNode }) {
  return children
}
