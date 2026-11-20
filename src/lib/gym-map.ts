import type { PublicGym } from './gyms'
import type { GeoPoint } from './location'

export const COMSATS_LAHORE = { latitude: 31.4030998, longitude: 74.2126162 }

export function gymMapSource(gym?: PublicGym | null, center?: GeoPoint | null, publicKey?: string) {
  if (gym?.source === 'osm' && gym.location) {
    const { latitude, longitude } = gym.location
    return 'https://www.openstreetmap.org/export/embed.html?' + new URLSearchParams({ bbox: [longitude - .015, latitude - .01, longitude + .015, latitude + .01].join(','), layer: 'mapnik', marker: latitude + ',' + longitude })
  }
  if (!gym && !center) {
    return publicKey
      ? `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(publicKey)}&center=${COMSATS_LAHORE.latitude},${COMSATS_LAHORE.longitude}&zoom=15`
      : `https://maps.google.com/maps?ll=${COMSATS_LAHORE.latitude},${COMSATS_LAHORE.longitude}&z=15&output=embed`
  }
  const query = gym ? gym.name + ' ' + gym.address : `gyms near ${center!.latitude},${center!.longitude}`
  return publicKey
    ? `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(publicKey)}&q=${encodeURIComponent(query)}`
    : 'https://www.google.com/maps?' + new URLSearchParams({ q: query, ...(center && !gym ? { ll: center.latitude + ',' + center.longitude, z: '13' } : {}), output: 'embed' })
}
