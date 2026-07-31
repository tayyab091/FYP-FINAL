import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildPageMetadata, organizationJsonLd, SITE_NAME, SITE_TAGLINE } from '@/lib/seo'
import HomePageClient from './HomePageClient'

export const metadata: Metadata = buildPageMetadata({
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description:
    "Pakistan's #1 AI-powered fitness platform. Connect with verified trainers, browse 1,500+ exercise demos, track nutrition, and level up your fitness journey.",
  path: '/',
  keywords: [
    'fitness platform Pakistan',
    'personal trainer',
    'AI form checker',
    'workout library',
    'nutrition tracking',
  ],
})

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <HomePageClient />
    </>
  )
}
