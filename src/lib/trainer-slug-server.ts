import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import { slugifyTrainerName } from '@/lib/trainer-slug'

/** Allocate a unique slug for a trainer name, optionally excluding one document. */
export async function allocateTrainerSlug(
  name: string,
  excludeTrainerId?: mongoose.Types.ObjectId | string,
): Promise<string> {
  await connectDB()
  const base = slugifyTrainerName(name)
  let candidate = base
  let suffix = 2

  while (true) {
    const query: Record<string, unknown> = { slug: candidate }
    if (excludeTrainerId) {
      query._id = { $ne: excludeTrainerId }
    }
    const taken = await Trainer.findOne(query).select('_id').lean()
    if (!taken) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}
