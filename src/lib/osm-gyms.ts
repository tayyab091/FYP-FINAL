import type { PublicGym } from './gyms'
import { getOrFetch } from './server-cache'
import { distanceKm, type GeoPoint } from './location'

interface OsmElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

export function normalizeOsmGyms(elements: OsmElement[], center: GeoPoint, radius: number): PublicGym[] {
  return elements.flatMap(element => {
    const latitude = element.lat ?? element.center?.lat
    const longitude = element.lon ?? element.center?.lon
    const tags = element.tags || {}
    if (!tags.name || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !['node', 'way', 'relation'].includes(element.type)) return []
    const location = { latitude: latitude!, longitude: longitude! }
    if (distanceKm(center, location) > radius / 1000) return []
    const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ')
    return [{
      id: `osm-${element.type}-${element.id}`, slug: `osm-${element.type}-${element.id}`, name: tags.name,
      address: address || 'Address not listed on OpenStreetMap', city: tags['addr:city'] || '', country: tags['addr:country'] || '',
      description: 'Community-mapped gym. Not registered or verified on T.E.S.T.',
      phone: tags['contact:phone'] || tags.phone, images: [], facilities: [], trainersCount: 0, rating: 0, reviewsCount: 0,
      verificationStatus: 'pending' as const, location, osmUri: `https://www.openstreetmap.org/${element.type}/${element.id}`, source: 'osm' as const,
    }]
  }).sort((a, b) => distanceKm(center, a.location!) - distanceKm(center, b.location!))
}

export async function searchOsmGyms(center: GeoPoint, radius: number) {
  const key = `osm-gyms:${center.latitude.toFixed(4)}:${center.longitude.toFixed(4)}:${radius}`
  return getOrFetch(key, 300_000, async () => {
    const around = `${radius},${center.latitude},${center.longitude}`
    const query = `[out:json][timeout:8];(nwr["leisure"="fitness_centre"]["name"](around:${around});nwr["sport"="fitness"]["name"](around:${around});nwr["amenity"="gym"]["name"](around:${around}););out center 200;`
    const response = await fetch('https://overpass.private.coffee/api/interpreter', {
      method: 'POST', body: new URLSearchParams({ data: query }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'TEST-Fitness/1.0 (https://fyp-final-ten.vercel.app)' },
      signal: AbortSignal.timeout(10_000), cache: 'no-store',
    })
    if (!response.ok) throw new Error('Nearby map search unavailable')
    const data = await response.json() as { elements?: OsmElement[]; remark?: string }
    if (!Array.isArray(data.elements) || data.remark) throw new Error('Nearby map search incomplete')
    return normalizeOsmGyms(data.elements, center, radius)
  })
}
