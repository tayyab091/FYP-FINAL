import { NextRequest, NextResponse } from 'next/server'
import { connectDBWithTimeout } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'
import '@/models/Gym'
import { locationFilter, distanceKm } from '@/lib/location'
import { createPublicSlug } from '@/lib/slug'
import { getOrFetch } from '@/lib/server-cache'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const FALLBACK_TRAINERS = [
  { _id: 'f1', slug: 'ali-hassan', name: 'Ali Hassan', specialty: ['Strength Training', 'HIIT'], country: 'Pakistan', rating: 4.8, bio: 'ACSM certified trainer with 5 years experience helping 200+ clients reach their goals.', isFullyVerified: true, isFeatured: true, profileImage: 'https://randomuser.me/api/portraits/men/1.jpg', gymName: 'FitZone Lahore' },
  { _id: 'f2', slug: 'sarah-khan', name: 'Sarah Khan', specialty: ['Yoga', 'Pilates'], country: 'Pakistan', rating: 4.9, bio: 'Yoga Alliance certified. Specializing in women\'s fitness and flexibility training.', isFullyVerified: true, isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/women/2.jpg', gymName: 'Elite Fitness Karachi' },
  { _id: 'f3', slug: 'usman-malik', name: 'Usman Malik', specialty: ['Bodybuilding', 'Nutrition'], country: 'Pakistan', rating: 4.7, bio: 'Former national bodybuilding champion. Custom meal plans included with every package.', isFullyVerified: true, isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/men/3.jpg', gymName: 'PowerHouse Islamabad' },
  { _id: 'f4', slug: 'fatima-rizvi', name: 'Fatima Rizvi', specialty: ['HIIT', 'Cardio', 'Postnatal'], country: 'Pakistan', rating: 4.9, bio: 'Specializing in HIIT and postnatal fitness. Online sessions available.', isFullyVerified: true, isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/women/4.jpg', gymName: 'Ladies Fitness Club' },
  { _id: 'f5', slug: 'bilal-ahmed', name: 'Bilal Ahmed', specialty: ['CrossFit'], country: 'Pakistan', rating: 4.6, bio: 'CrossFit Level 2 certified. Training athletes and beginners since 2019.', isFullyVerified: true, isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/men/5.jpg', gymName: 'CrossFit Lahore' },
  { _id: 'f6', slug: 'zara-malik', name: 'Zara Malik', specialty: ['Yoga', 'Meditation', 'Wellness'], country: 'Pakistan', rating: 4.8, bio: '300-hour certified yoga instructor and wellness coach. Mind-body connection specialist.', isFullyVerified: true, isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/women/6.jpg', gymName: 'Zen Wellness Studio' },
].map((trainer) => ({ ...trainer, isFallback: true }))

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const nearby = locationFilter(searchParams)
  if (nearby && 'error' in nearby) return NextResponse.json({ message: nearby.error }, { status: 400 })
  const specialty = (searchParams.get('specialty') || '').trim().slice(0, 80)
  const country = (searchParams.get('country') || '').trim().slice(0, 80)
  const search = (searchParams.get('search') || '').trim().slice(0, 100)
  const requestedLimit = parseInt(searchParams.get('limit') || '20')
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 20
  const featured = Boolean(searchParams.get('featured'))

  const fallbackResponse = () => {
    let fallback = nearby ? [] : FALLBACK_TRAINERS
    if (specialty) fallback = fallback.filter(t => t.specialty.some(s => s.toLowerCase().includes(specialty.toLowerCase())))
    if (country) fallback = fallback.filter(t => t.country.toLowerCase().includes(country.toLowerCase()))
    if (search) fallback = fallback.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.bio.toLowerCase().includes(search.toLowerCase()))
    if (featured) fallback = fallback.filter(t => t.isFeatured)
    return NextResponse.json({ trainers: fallback.slice(0, limit), meta: { source: 'fallback', connectable: false } }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }
  try {

    const query: Record<string, unknown> = { isFullyVerified: true, isActive: true }
    if (specialty) query.specialty = { $in: [new RegExp(escapeRegex(specialty), 'i')] }
    if (country) query.country = new RegExp(escapeRegex(country), 'i')
    if (featured) query.isFeatured = true
    if (search) {
      query.$or = [
        { name: new RegExp(escapeRegex(search), 'i') },
        { bio: new RegExp(escapeRegex(search), 'i') },
        { specialty: { $in: [new RegExp(escapeRegex(search), 'i')] } },
      ]
    }

    const trainers = await getOrFetch<Array<Record<string, unknown>>>(
      `public-trainers:${JSON.stringify([specialty, country, search, limit, featured, Boolean(nearby)])}`, 30_000,
      async () => {
        await connectDBWithTimeout(4000)
        const listing = Trainer.find(query)
          .select('name slug specialty country rating bio isFullyVerified isActive isFeatured profileImage gymName totalClients experience certifications hourlyRate languages gymId').limit(nearby ? 0 : limit)

        if (nearby) listing.populate('gymId', 'location')
        return listing.lean()
      },
    )

    // Always return data — use fallback if DB is empty
    if (trainers.length === 0) {
      return fallbackResponse()
    }

    return NextResponse.json({
      trainers: trainers.map(trainer => {
        const gym = trainer.gymId as { location?: { coordinates?: number[] } } | null
        const coordinates = gym?.location?.coordinates
        const distance = nearby && coordinates?.length === 2
          ? distanceKm(nearby, { latitude: coordinates[1], longitude: coordinates[0] }) : undefined
        const profile = { ...trainer }
        delete profile.gymId
        return { ...profile, ...(distance !== undefined ? { distanceKm: Math.round(distance * 10) / 10 } : {}) } as Record<string, unknown> & { distanceKm?: number }
      }).filter(trainer => !nearby || (trainer.distanceKm !== undefined && trainer.distanceKm <= nearby.radius)).slice(0, limit).map(trainer => ({
        ...trainer,
        slug: trainer.slug || createPublicSlug(String(trainer.name), String(trainer._id)),
      })),
      meta: { source: 'database', connectable: true },
    }, { headers: { 'Cache-Control': nearby ? 'private, no-store' : 'public, max-age=30, s-maxage=60, stale-while-revalidate=30' } })
  } catch (error) {
    console.error('Trainers error:', error)
    return fallbackResponse()
  }
}
