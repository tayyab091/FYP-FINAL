import type { Metadata } from 'next'

export const SITE_NAME = 'T.E.S.T.'
export const SITE_TAGLINE = 'Train. Eat. Sleep. Thrive.'
export const DEFAULT_DESCRIPTION =
  "Pakistan's first AI-powered fitness coaching platform. Connect with verified trainers, track nutrition, and achieve your fitness goals."

export const DEFAULT_KEYWORDS = [
  'fitness',
  'personal trainer',
  'workout',
  'nutrition',
  'Pakistan',
  'AI coaching',
  'exercise library',
  'meal plans',
  'form checker',
]

/** Canonical production URL; override with NEXT_PUBLIC_APP_URL in env. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'https://fyp-final-ten.vercel.app'
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getSiteUrl()}${normalized}`
}

export type PageMetadataOptions = {
  title: string
  description: string
  path: string
  keywords?: string[]
  ogImage?: string
  noIndex?: boolean
  type?: 'website' | 'article' | 'profile'
}

export function buildPageMetadata(options: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(options.path)
  const fullTitle = options.title.includes(SITE_NAME)
    ? options.title
    : `${options.title} | ${SITE_NAME}`

  const ogImages = options.ogImage
    ? [{ url: options.ogImage, width: 1200, height: 630, alt: fullTitle }]
    : undefined

  return {
    title: options.title,
    description: options.description,
    keywords: options.keywords ?? DEFAULT_KEYWORDS,
    alternates: { canonical },
    robots: options.noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      type: options.type ?? 'website',
      locale: 'en_PK',
      url: canonical,
      siteName: SITE_NAME,
      title: fullTitle,
      description: options.description,
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: ogImages ? 'summary_large_image' : 'summary',
      title: fullTitle,
      description: options.description,
      ...(ogImages ? { images: ogImages.map((i) => i.url) } : {}),
    },
  }
}

export const NO_INDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: 'T.E.S.T. Fitness',
    url: getSiteUrl(),
    description: DEFAULT_DESCRIPTION,
    areaServed: { '@type': 'Country', name: 'Pakistan' },
    sameAs: [],
  }
}

export function personJsonLd(trainer: {
  name: string
  slug?: string
  bio?: string
  profileImage?: string
  country?: string
  specialty?: string[]
  rating?: number
}) {
  const path = trainer.slug ? `/coaching/${trainer.slug}` : '/coaching'
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: trainer.name,
    description: trainer.bio || `Verified fitness trainer on ${SITE_NAME}`,
    url: absoluteUrl(path),
    ...(trainer.profileImage ? { image: trainer.profileImage } : {}),
    ...(trainer.country ? { nationality: trainer.country } : {}),
    ...(trainer.specialty?.length
      ? { knowsAbout: trainer.specialty }
      : {}),
    ...(trainer.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: trainer.rating,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    jobTitle: 'Personal Trainer',
    worksFor: { '@type': 'Organization', name: SITE_NAME, url: getSiteUrl() },
  }
}

export function subscriptionServiceJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${SITE_NAME} Membership Plans`,
    description:
      'Fitness coaching subscriptions with AI form checking, trainer chat, meal plans, and live sessions.',
    provider: { '@type': 'Organization', name: SITE_NAME, url: getSiteUrl() },
    areaServed: { '@type': 'Country', name: 'Pakistan' },
    url: absoluteUrl('/subscription'),
    offers: [
      {
        '@type': 'Offer',
        name: 'Basic',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free tier with community access and basic nutrition guides',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '19',
        priceCurrency: 'USD',
        description: 'Unlimited workouts, AI form checker, and trainer chat',
      },
      {
        '@type': 'Offer',
        name: 'Elite',
        price: '39',
        priceCurrency: 'USD',
        description: 'Live training sessions and unlimited trainer connections',
      },
    ],
  }
}

export function exerciseJsonLd(exercise: {
  id: string
  name: string
  instructions: string
  muscle: string
  equipment: string
  gifUrl?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ExercisePlan',
    name: exercise.name,
    description: exercise.instructions.slice(0, 300),
    url: absoluteUrl(`/exercises/${exercise.id}`),
    ...(exercise.gifUrl ? { image: exercise.gifUrl } : {}),
    exerciseType: exercise.muscle,
    equipment: exercise.equipment,
  }
}
