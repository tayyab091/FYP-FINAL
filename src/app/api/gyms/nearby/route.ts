import { NextRequest, NextResponse } from 'next/server'
import { createPublicSlug } from '@/lib/slug'

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
}

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function GET(req: NextRequest) {
  const latitude = numberParam(req.nextUrl.searchParams.get('lat'), 31.5204)
  const longitude = numberParam(req.nextUrl.searchParams.get('lng'), 74.3587)
  const radius = Math.min(50_000, Math.max(500, numberParam(req.nextUrl.searchParams.get('radius'), 8_000)))
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ message: 'Invalid map coordinates' }, { status: 400 })
  }

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
        ].join(','),
      },
      body: JSON.stringify({
        includedTypes: ['gym'],
        maxResultCount: 20,
        rankPreference: 'POPULARITY',
        languageCode: 'en',
        regionCode: 'PK',
        locationRestriction: {
          circle: { center: { latitude, longitude }, radius },
        },
      }),
      cache: 'no-store',
    })

    const data = await response.json() as { places?: GooglePlace[]; error?: { message?: string } }
    if (!response.ok) {
      return NextResponse.json(
        { message: data.error?.message || 'Google Places request failed', places: [] },
        { status: response.status },
      )
    }

    const places = (data.places || []).map((place) => {
      const name = place.displayName?.text || 'Nearby gym'
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

    return NextResponse.json({ configured: true, places })
  } catch (error) {
    console.error('Google Places nearby search failed:', error)
    return NextResponse.json({ message: 'Google Places is temporarily unavailable', places: [] }, { status: 502 })
  }
}
