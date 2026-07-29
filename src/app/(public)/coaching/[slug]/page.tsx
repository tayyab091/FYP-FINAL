import mongoose from 'mongoose'
import { permanentRedirect } from 'next/navigation'
import { findTrainerByIdOrSlug } from '@/lib/resolve-trainer'
import { CoachingDetailClient } from './CoachingDetailClient'

type PageProps = { params: Promise<{ slug: string }> }

export default async function TrainerProfilePage({ params }: PageProps) {
  const { slug } = await params

  if (mongoose.isValidObjectId(slug)) {
    const trainer = await findTrainerByIdOrSlug(slug)
    if (trainer?.slug) {
      permanentRedirect(`/coaching/${trainer.slug}`)
    }
  }

  return <CoachingDetailClient slug={slug} />
}
