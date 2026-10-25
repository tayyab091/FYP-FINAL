/** Client-safe trainer slug helpers (no database imports). */

export function slugifyTrainerName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'trainer'
}

/** Public profile URL for a trainer card or notification link. */
export function trainerPublicPath(trainer: { slug?: string; _id: string }): string {
  const slug = trainer.slug?.trim() || trainer._id
  return `/coaching/${encodeURIComponent(slug)}`
}
