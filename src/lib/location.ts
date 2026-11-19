export interface GeoPoint { latitude: number; longitude: number }

export function distanceKm(a: GeoPoint, b: GeoPoint) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitude = radians(b.latitude - a.latitude)
  const longitude = radians(b.longitude - a.longitude)
  const value = Math.sin(latitude / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitude / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)))
}

export function locationFilter(params: URLSearchParams) {
  if (!params.has('lat') && !params.has('lng')) return null
  const latitude = Number(params.get('lat'))
  const longitude = Number(params.get('lng'))
  const radius = Number(params.get('radius') || 10)
  if (!params.has('lat') || !params.has('lng') || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || !Number.isFinite(radius) || radius < 1 || radius > 100) {
    return { error: 'Choose a valid location and radius between 1 and 100 km.' } as const
  }
  return { latitude, longitude, radius }
}
