import mongoose from 'mongoose'
import Trainer from '@/models/Trainer'
import { connectDB } from '@/lib/mongodb'

export type TrainerLean = {
  _id: mongoose.Types.ObjectId
  slug?: string
  userId?: mongoose.Types.ObjectId
  name?: string
  [key: string]: unknown
}

/** Resolve a public trainer reference (Mongo ObjectId or URL slug). */
export async function findTrainerByIdOrSlug(ref: string): Promise<TrainerLean | null> {
  await connectDB()
  const trimmed = ref.trim()
  if (mongoose.isValidObjectId(trimmed)) {
    const byId = await Trainer.findById(trimmed).lean()
    if (byId) return byId as TrainerLean
  }
  const bySlug = await Trainer.findOne({ slug: trimmed.toLowerCase() }).lean()
  return bySlug ? (bySlug as TrainerLean) : null
}

export async function resolveTrainerObjectId(ref: string): Promise<string | null> {
  const trainer = await findTrainerByIdOrSlug(ref)
  return trainer?._id?.toString() ?? null
}
