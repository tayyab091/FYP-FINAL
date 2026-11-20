import type { PublicGym } from './gyms'
import type { GeoPoint } from './location'

export const COMSATS_LAHORE = { latitude: 31.4030998, longitude: 74.2126162 }

export function gymMapSource(gym?: PublicGym | null, center?: GeoPoint | null, publicKey?: string, radiusKm = 10) {
  const zoom = String(Math.max(8, Math.min(16, Math.floor(Math.log2(40075 * Math.cos((center?.latitude ?? 31.4) * Math.PI / 180) * 400 / (256 * Math.max(1, radiusKm) * 2))))))
  if (gym?.source === 'osm' && gym.location) {
    const { latitude, longitude } = gym.location
    return 'https://www.openstreetmap.org/export/embed.html?' + new URLSearchParams({ bbox: [longitude - .015, latitude - .01, longitude + .015, latitude + .01].join(','), layer: 'mapnik', marker: latitude + ',' + longitude })
  }
  if (!gym && !center) {
    return publicKey
      ? `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(publicKey)}&center=${COMSATS_LAHORE.latitude},${COMSATS_LAHORE.longitude}&zoom=15`
      : `https://maps.google.com/maps?ll=${COMSATS_LAHORE.latitude},${COMSATS_LAHORE.longitude}&z=15&output=embed`
  }
  // Coordinates identify the exact branch; a name/address search can pick another gym.
  const query = gym
    ? gym.googlePlaceId ? 'place_id:' + gym.googlePlaceId : gym.location
      ? gym.location.latitude + ',' + gym.location.longitude : gym.name + ' ' + gym.address
    : `gyms near ${center!.latitude},${center!.longitude}`
  return publicKey
    ? 'https://www.google.com/maps/embed/v1/search?' + new URLSearchParams({ key: publicKey, q: query,
      ...(center && !gym ? { q: 'gyms', center: center.latitude + ',' + center.longitude, zoom } : {}) })
    : 'https://www.google.com/maps?' + new URLSearchParams({ q: query, ...(center && !gym ? { ll: center.latitude + ',' + center.longitude, sll: center.latitude + ',' + center.longitude, z: zoom } : {}), output: 'embed' })
}
