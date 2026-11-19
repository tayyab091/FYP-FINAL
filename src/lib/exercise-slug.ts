import { slugify } from './slug'
export function exerciseDetailPath(exercise: { id: string; name: string }) {
  return '/exercises/' + slugify(exercise.name) + '--' + encodeURIComponent(exercise.id)
}
export function exerciseIdFromPath(value: string) {
  return value.includes('--') ? value.slice(value.lastIndexOf('--') + 2) : value
}
