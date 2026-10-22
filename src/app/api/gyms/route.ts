import { NextRequest, NextResponse } from 'next/server'
import { connectDBWithTimeout } from '@/lib/mongodb'
import Gym from '@/models/Gym'
import { normalizeGym, PREVIEW_GYMS } from '@/lib/gyms'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET(req: NextRequest) {
  const search = (req.nextUrl.searchParams.get('search') || '').trim().slice(0, 100)
  const city = (req.nextUrl.searchParams.get('city') || '').trim().slice(0, 80)

  try {
    await connectDBWithTimeout(4000)
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

    const docs = await Gym.find(query).sort({ rating: -1, createdAt: -1 }).limit(60).lean()
    const gyms = docs.map((doc) => normalizeGym(doc as unknown as Record<string, unknown>))
    if (gyms.length > 0) {
      return NextResponse.json({ gyms, total: gyms.length, isPreview: false })
    }
  } catch (error) {
    console.error('Public gyms lookup failed:', error)
  }

  let gyms = PREVIEW_GYMS
  if (city) gyms = gyms.filter((gym) => gym.city.toLowerCase() === city.toLowerCase())
  if (search) {
    const needle = search.toLowerCase()
    gyms = gyms.filter((gym) =>
      [gym.name, gym.address, gym.city, ...gym.facilities].some((value) => value.toLowerCase().includes(needle)),
    )
  }
  return NextResponse.json({ gyms, total: gyms.length, isPreview: true })
}
