import type { MetadataRoute } from 'next'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import { getExerciseCatalog } from '@/lib/exercises-api'
import { getMealCatalog } from '@/lib/meals'
import { absoluteUrl, getSiteUrl } from '@/lib/seo'

/** Generated on request — catalog APIs are too slow for static build. */
export const dynamic = 'force-dynamic'
export const revalidate = 86400

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
  { url: absoluteUrl('/coaching'), changeFrequency: 'daily', priority: 0.9 },
  { url: absoluteUrl('/exercises'), changeFrequency: 'weekly', priority: 0.9 },
  { url: absoluteUrl('/nutrition'), changeFrequency: 'weekly', priority: 0.8 },
  { url: absoluteUrl('/exercise-check'), changeFrequency: 'monthly', priority: 0.7 },
  { url: absoluteUrl('/subscription'), changeFrequency: 'monthly', priority: 0.8 },
  { url: absoluteUrl('/login'), changeFrequency: 'yearly', priority: 0.3 },
  { url: absoluteUrl('/signup'), changeFrequency: 'yearly', priority: 0.5 },
]

async function getTrainerEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    await connectDB()
    const trainers = await Trainer.find({ isActive: { $ne: false } })
      .select('slug updatedAt')
      .lean()
    return trainers
      .filter((t) => t.slug)
      .map((t) => ({
        url: absoluteUrl(`/coaching/${t.slug}`),
        lastModified: t.updatedAt ? new Date(t.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
  } catch {
    return []
  }
}

async function getExerciseEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const { exercises } = await getExerciseCatalog()
    return exercises.map((e) => ({
      url: absoluteUrl(`/exercises/${e.id}`),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
  } catch {
    return []
  }
}

async function getMealEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const { meals } = await getMealCatalog()
    return meals.map((m) => ({
      url: absoluteUrl(`/nutrition/${m.id}`),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    }))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Ensure absoluteUrl uses configured host even if env is unset at build time
  void getSiteUrl()

  const [trainers, exercises, meals] = await Promise.all([
    getTrainerEntries(),
    getExerciseEntries(),
    getMealEntries(),
  ])

  return [...STATIC_ROUTES, ...trainers, ...exercises, ...meals]
}
