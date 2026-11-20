import { NextRequest, NextResponse } from 'next/server'
import { connectDBWithTimeout } from '@/lib/mongodb'
import Gym from '@/models/Gym'
import { photoMetadata, type GooglePhoto } from '@/lib/google-gym-photos'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, 'gym-google-details', 40, 600_000)
  if (limited) return limited
  const id = req.nextUrl.searchParams.get('gymId') || ''
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ photo: null }, { status: 400 })
  const headers = { 'Cache-Control': 'private, no-store' }
  if (!process.env.GOOGLE_MAPS_API_KEY) return NextResponse.json({ photo: null }, { headers })
  try {
    await connectDBWithTimeout(4000)
    const gym = await Gym.findOne({ _id: id, verificationStatus: 'verified' }).select('googlePlaceId').lean()
    if (!gym?.googlePlaceId) return NextResponse.json({ photo: null }, { headers })
    const response = await fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(gym.googlePlaceId), { headers: { 'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': 'photos' }, cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!response.ok) return NextResponse.json({ photo: null }, { headers })
    const data = await response.json() as { photos?: GooglePhoto[] }
    return NextResponse.json({ photo: photoMetadata(data.photos?.[0]) || null }, { headers })
  } catch { return NextResponse.json({ photo: null }, { headers }) }
}
