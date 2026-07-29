import mongoose from 'mongoose'
import { permanentRedirect } from 'next/navigation'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import { CoachingDetailClient } from './CoachingDetailClient'

type PageProps = { params: Promise<{ slug: string }> }

export default async function TrainerProfilePage({ params }: PageProps) {
  const { slug } = await params

  if (mongoose.isValidObjectId(slug)) {
    await connectDB()
    const trainer = await Trainer.findById(slug).select('slug').lean()
    if (trainer?.slug) {
      permanentRedirect(`/coaching/${trainer.slug}`)
    }
  }

  return <CoachingDetailClient slug={slug} />
}
