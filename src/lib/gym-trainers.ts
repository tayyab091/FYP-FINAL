import Trainer from '@/models/Trainer'
import type { PublicGym } from './gyms'
import { createPublicSlug } from './slug'

/** Use the trainer's current approved affiliation, rather than stale gym counters. */
export async function withGymTrainers(gyms: PublicGym[]): Promise<PublicGym[]> {
  if (!gyms.length) return gyms
  const rows = await Trainer.find({ gymId: { $in: gyms.map(gym => gym.id) }, gymVerificationStatus: 'approved', isFullyVerified: true, isActive: true })
    .select('name slug specialty rating profileImage gymId').sort({ name: 1 }).lean()
  return gyms.map(gym => {
    const trainers = rows.filter(row => String(row.gymId) === gym.id).map(row => ({
      id: String(row._id), name: String(row.name), slug: row.slug || createPublicSlug(String(row.name), String(row._id)),
      specialty: Array.isArray(row.specialty) ? row.specialty.map(String) : [], rating: Number(row.rating || 0), profileImage: String(row.profileImage || ''),
    }))
    return { ...gym, trainers, trainersCount: trainers.length }
  })
}
