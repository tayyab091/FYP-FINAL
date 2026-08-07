import type { Metadata } from 'next'
import mongoose from 'mongoose'
import { permanentRedirect } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildPageMetadata, personJsonLd } from '@/lib/seo'
import { findTrainerByIdOrSlug } from '@/lib/resolve-trainer'
import { CoachingDetailClient } from './CoachingDetailClient'

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const trainer = await findTrainerByIdOrSlug(slug)

  if (!trainer) {
    return buildPageMetadata({
      title: 'Trainer Not Found',
      description: 'This trainer profile could not be found. Browse verified coaches on T.E.S.T.',
      path: `/coaching/${slug}`,
      noIndex: true,
    })
  }

  const name = (trainer.name as string) || 'Trainer'
  const specialties = Array.isArray(trainer.specialty)
    ? (trainer.specialty as string[]).join(', ')
    : ''
  const bio =
    typeof trainer.bio === 'string' && trainer.bio.trim()
      ? trainer.bio.slice(0, 155)
      : `Connect with ${name}, a verified fitness trainer on T.E.S.T.${specialties ? ` Specialties: ${specialties}.` : ''}`

  const path = trainer.slug ? `/coaching/${trainer.slug}` : `/coaching/${slug}`

  return buildPageMetadata({
    title: `${name} — Personal Trainer`,
    description: bio,
    path,
    type: 'profile',
    ogImage: typeof trainer.profileImage === 'string' ? trainer.profileImage : undefined,
    keywords: ['personal trainer', name, ...(Array.isArray(trainer.specialty) ? (trainer.specialty as string[]) : [])],
  })
}

export default async function TrainerProfilePage({ params }: PageProps) {
  const { slug } = await params

  if (mongoose.isValidObjectId(slug)) {
    const trainer = await findTrainerByIdOrSlug(slug)
    if (trainer?.slug) {
      permanentRedirect(`/coaching/${trainer.slug}`)
    }
  }

  const trainer = await findTrainerByIdOrSlug(slug)

  return (
    <>
      {trainer ? (
        <JsonLd
          data={personJsonLd({
            name: (trainer.name as string) || 'Trainer',
            slug: trainer.slug as string | undefined,
            bio: typeof trainer.bio === 'string' ? trainer.bio : undefined,
            profileImage: typeof trainer.profileImage === 'string' ? trainer.profileImage : undefined,
            country: typeof trainer.country === 'string' ? trainer.country : undefined,
            specialty: Array.isArray(trainer.specialty) ? (trainer.specialty as string[]) : undefined,
            rating: typeof trainer.rating === 'number' ? trainer.rating : undefined,
          })}
        />
      ) : null}
      <CoachingDetailClient slug={slug} />
    </>
  )
}
