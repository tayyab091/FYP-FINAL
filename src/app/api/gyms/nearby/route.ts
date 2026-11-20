import { NextRequest, NextResponse } from 'next/server'
import { createPublicSlug } from '@/lib/slug'
import { photoMetadata, type GooglePhoto } from '@/lib/google-gym-photos'
import { rateLimit } from '@/lib/rate-limit'

interface GooglePlace {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  nationalPhoneNumber?: string
  regularOpeningHours?: { openNow?: boolean }
  photos?: GooglePhoto[]
}

function numberParam(value: string | null, fallback: number) {
  const parsed = value === null || value.trim() === '' ? NaN : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function GET(req: NextRequest) {
  const latitude = numberParam(req.nextUrl.searchParams.get('lat'), NaN)
  const longitude = numberParam(req.nextUrl.searchParams.get('lng'), NaN)
  const radius = Math.min(50_000, Math.max(500, numberParam(req.nextUrl.searchParams.get('radius'), 8_000)))
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ message: 'Invalid map coordinates' }, { status: 400 })
  }
  const limited = rateLimit(req, 'gym-nearby', 30, 600_000)
  if (limited) return limited

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { message: 'Google Places is not configured', configured: false, places: [] },
      { status: 503 },
    )
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.googleMapsUri',
          'places.nationalPhoneNumber',
          'places.regularOpeningHours.openNow',
          'places.photos',
        ].join(','),
      },
      body: JSON.stringify({
        includedTypes: ['gym'],
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        languageCode: 'en',
        regionCode: 'PK',
        locationRestriction: {
          circle: { center: { latitude, longitude }, radius },
        },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })

    const data = await response.json() as { places?: GooglePlace[]; error?: { message?: string } }
    if (!response.ok) {
      return NextResponse.json(
        { message: 'Google gym discovery is unavailable. Registered gyms are still shown.', places: [] },
        { status: 502 },
      )
    }

    const places = (data.places || []).map((place) => {
      const name = place.displayName?.text || 'Nearby gym'
      const photo = photoMetadata(place.photos?.[0])
      return {
        id: place.id || createPublicSlug(name),
        slug: createPublicSlug(name, place.id),
        name,
        address: place.formattedAddress || '',
        city: '',
        country: 'Pakistan',
        description: place.regularOpeningHours?.openNow === true
          ? 'Open now · Live result from Google Places'
          : 'Live result from Google Places',
        phone: place.nationalPhoneNumber,
        images: [],
        coverImage: photo?.url,
        googlePhoto: photo,
        googlePlaceId: place.id,
        facilities: [],
        trainersCount: 0,
        rating: place.rating || 0,
        reviewsCount: place.userRatingCount || 0,
        verificationStatus: 'pending',
        location: place.location?.latitude !== undefined && place.location?.longitude !== undefined
          ? { latitude: place.location.latitude, longitude: place.location.longitude }
          : undefined,
        googleMapsUri: place.googleMapsUri,
        source: 'google',
      }
    })

    return NextResponse.json({ configured: true, places, maxResults: 20 }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ message: 'Google Places is temporarily unavailable', places: [] }, { status: 502 })
  }
}
