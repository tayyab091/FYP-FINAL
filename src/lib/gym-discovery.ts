import type { PublicGym } from './gyms'
import { distanceKm } from './location'

const nameKey = (name: string) => name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/** Prefer registered profiles and deduplicate mapped listings of the same gym. */
export function mergeNearbyGyms(registered: PublicGym[], google: PublicGym[], center: { latitude: number; longitude: number }, radiusKm: number) {
  const results = registered.filter(gym => gym.location && distanceKm(center, gym.location) <= radiusKm)
  for (const place of google) {
    if (!place.location || distanceKm(center, place.location) > radiusKm) continue
    const duplicate = results.some(gym =>
      (gym.googlePlaceId && gym.googlePlaceId === place.googlePlaceId) ||
      (gym.location && nameKey(gym.name) === nameKey(place.name) && distanceKm(gym.location, place.location!) < .15),
    )
    if (!duplicate) results.push(place)
  }
  return results.sort((a, b) => (a.location ? distanceKm(center, a.location) : Infinity) - (b.location ? distanceKm(center, b.location) : Infinity))
}
