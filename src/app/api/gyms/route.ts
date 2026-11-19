import { NextRequest, NextResponse } from 'next/server'
import { locationFilter, distanceKm } from '@/lib/location'
import { connectDBWithTimeout } from '@/lib/mongodb'
import Gym from '@/models/Gym'
import { normalizeGym, PREVIEW_GYMS } from '@/lib/gyms'
import { getOrFetch } from '@/lib/server-cache'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET(req: NextRequest) {
  const nearby = locationFilter(req.nextUrl.searchParams)
  if (nearby && 'error' in nearby) return NextResponse.json({ message: nearby.error }, { status: 400 })
  const search = (req.nextUrl.searchParams.get('search') || '').trim().slice(0, 100)
  const city = (req.nextUrl.searchParams.get('city') || '').trim().slice(0, 80)

  try {
    const query: Record<string, unknown> = { verificationStatus: 'verified' }
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i')
      query.$or = [
        { name: pattern },
        { address: pattern },
        { city: pattern },
        { facilities: { $in: [pattern] } },
      ]
    }
    if (city) query.city = new RegExp(`^${escapeRegex(city)}$`, 'i')

    const gyms = await getOrFetch(`public-gyms:${JSON.stringify([search, city, Boolean(nearby)])}`, 30_000, async () => {
      await connectDBWithTimeout(4000)
      const docs = await Gym.find(query).sort({ rating: -1, createdAt: -1 }).limit(nearby ? 0 : 60).lean()
      return docs.map((doc) => normalizeGym(doc as unknown as Record<string, unknown>))
    })
    if (nearby) {
      const located = gyms.filter(gym => gym.location).map(gym => ({
        ...gym, distanceKm: distanceKm(nearby, gym.location!),
      })).filter(gym => gym.distanceKm <= nearby.radius).sort((a, b) => a.distanceKm - b.distanceKm)
      return NextResponse.json({ gyms: located, total: located.length, isPreview: false }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    if (gyms.length > 0) {
      return NextResponse.json({ gyms: gyms.slice(0, 60), total: Math.min(60, gyms.length), isPreview: false }, {
        headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=30' },
      })
    }
  } catch (error) {
    console.error('Public gyms lookup failed:', error)
  }

  if (nearby) return NextResponse.json({ gyms: [], total: 0, message: 'No registered gyms with coordinates were found within this radius.' })
  let gyms = PREVIEW_GYMS
  if (city) gyms = gyms.filter((gym) => gym.city.toLowerCase() === city.toLowerCase())
  if (search) {
    const needle = search.toLowerCase()
    gyms = gyms.filter((gym) =>
      [gym.name, gym.address, gym.city, ...gym.facilities].some((value) => value.toLowerCase().includes(needle)),
    )
  }
  return NextResponse.json({ gyms, total: gyms.length, isPreview: true }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
