export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function createPublicSlug(name: string, id?: string): string {
  const base = slugify(name) || 'profile'
  if (!id) return base
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  const suffix = /^[a-f\d]{24}$/.test(cleaned) ? cleaned : cleaned.slice(-8)
  return suffix ? `${base}-${suffix}` : base
}

export function idFromPublicSlug(value: string): string | null {
  const suffix = value.split('-').at(-1)
  return suffix && /^(?:[a-f\d]{24}|[a-f\d]{8})$/i.test(suffix) ? suffix : null
}
