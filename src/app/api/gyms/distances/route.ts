import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { routeDistances, validPoint, type RouteElement } from '@/lib/gym-distances'
import type { GeoPoint } from '@/lib/location'

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'gym-distances', 20, 600_000)
  if (limited) return limited
  let body: { origin: GeoPoint; destinations: GeoPoint[] }
  try {
    body = await req.json()
    if (!validPoint(body.origin) || !Array.isArray(body.destinations) || !body.destinations.length ||
      body.destinations.length > 250 || !body.destinations.every(validPoint)) throw new Error('Invalid points')
  } catch {
    return NextResponse.json({ message: 'Invalid routing coordinates.' }, { status: 400 })
  }
  const key = process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
  if (!key) return NextResponse.json({ provider: 'straight-line' })
  try {
    const distances: (number | null)[] = []
    // Coordinate waypoints are limited to 50 per request (including the origin).
    for (let offset = 0; offset < body.destinations.length; offset += 49) {
      const destinations = body.destinations.slice(offset, offset + 49)
      const response = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'destinationIndex,status,condition,distanceMeters' },
        body: JSON.stringify({ origins: [{ waypoint: { location: { latLng: body.origin } } }],
          destinations: destinations.map(point => ({ waypoint: { location: { latLng: point } } })),
          travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE' }),
        cache: 'no-store', signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) throw new Error('Routing unavailable')
      const rows = await response.json() as RouteElement[]
      if (!Array.isArray(rows)) throw new Error('Invalid routing response')
      distances.push(...routeDistances(rows, destinations.length))
    }
    return NextResponse.json({ provider: 'google', distances }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ provider: 'straight-line' }, { headers: { 'Cache-Control': 'private, no-store' } })
  }
}
