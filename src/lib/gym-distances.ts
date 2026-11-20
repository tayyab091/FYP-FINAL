import type { GeoPoint } from './location'

export interface RouteElement {
  destinationIndex?: number
  status?: { code?: number }
  condition?: string
  distanceMeters?: number
}

/** Missing/unreachable routes remain null; never silently substitute air distance. */
export function routeDistances(elements: RouteElement[], count: number): (number | null)[] {
  const distances: (number | null)[] = Array(count).fill(null)
  for (const row of elements) {
    const index = row.destinationIndex ?? 0
    if (Number.isInteger(index) && index >= 0 && index < count && !row.status?.code &&
      row.condition === 'ROUTE_EXISTS' && typeof row.distanceMeters === 'number' &&
      Number.isFinite(row.distanceMeters) && row.distanceMeters >= 0) distances[index] = row.distanceMeters / 1000
  }
  return distances
}

export function validPoint(point: GeoPoint) {
  return point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180
}
