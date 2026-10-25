import { slugify } from '@/lib/slug'

export function mealSlug(name: string, id: string): string {
  const base = slugify(name)
  const safeId = String(id).trim().replace(/[^a-zA-Z0-9-]/g, '')
  return base && safeId ? `${base}-${safeId}` : base || safeId || 'meal'
}

export function parseMealId(slugOrId: string): string {
  if (/^\d+$/.test(slugOrId)) return slugOrId
  const match = slugOrId.match(/(\d+)$/)
  return match?.[1] ?? slugOrId
}

export function mealDetailPath(name: string, id: string): string {
  return `/nutrition/${mealSlug(name, id)}`
}
