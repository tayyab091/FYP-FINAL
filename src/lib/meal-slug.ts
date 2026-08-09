export function mealSlug(name: string, id: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return base ? `${base}-${id}` : id
}

export function parseMealId(slugOrId: string): string {
  if (/^\d+$/.test(slugOrId)) return slugOrId
  const match = slugOrId.match(/(\d+)$/)
  return match?.[1] ?? slugOrId
}

export function mealDetailPath(name: string, id: string): string {
  return `/nutrition/${mealSlug(name, id)}`
}
