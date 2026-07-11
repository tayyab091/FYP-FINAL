import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Trainer from '@/models/Trainer'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const FALLBACK_TRAINERS = [
  { _id: 'f1', name: 'Ali Hassan', specialty: ['Strength Training', 'HIIT'], country: 'Pakistan', rating: 4.8, bio: 'ACSM certified trainer with 5 years experience helping 200+ clients reach their goals.', isFullyVerified: true, isFeatured: true, profileImage: 'https://randomuser.me/api/portraits/men/1.jpg', gymName: 'FitZone Lahore' },
  { _id: 'f2', name: 'Sarah Khan', specialty: ['Yoga', 'Pilates'], country: 'Pakistan', rating: 4.9, bio: 'Yoga Alliance certified. Specializing in women\'s fitness and flexibility training.', isFullyVerified: true, isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/women/2.jpg', gymName: 'Elite Fitness Karachi' },
  { _id: 'f3', name: 'Usman Malik', specialty: ['Bodybuilding', 'Nutrition'], country: 'Pakistan', rating: 4.7, bio: 'Former national bodybuilding champion. Custom meal plans included with every package.', isFullyVerified: true, isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/men/3.jpg', gymName: 'PowerHouse Islamabad' },
  { _id: 'f4', name: 'Fatima Rizvi', specialty: ['HIIT', 'Cardio', 'Postnatal'], country: 'Pakistan', rating: 4.9, bio: 'Specializing in HIIT and postnatal fitness. Online sessions available.', isFullyVerified: true, isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/women/4.jpg', gymName: 'Ladies Fitness Club' },
  { _id: 'f5', name: 'Bilal Ahmed', specialty: ['CrossFit'], country: 'Pakistan', rating: 4.6, bio: 'CrossFit Level 2 certified. Training athletes and beginners since 2019.', isFullyVerified: true, isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/men/5.jpg', gymName: 'CrossFit Lahore' },
  { _id: 'f6', name: 'Zara Malik', specialty: ['Yoga', 'Meditation', 'Wellness'], country: 'Pakistan', rating: 4.8, bio: '300-hour certified yoga instructor and wellness coach. Mind-body connection specialist.', isFullyVerified: true, isFeatured: false, profileImage: 'https://randomuser.me/api/portraits/women/6.jpg', gymName: 'Zen Wellness Studio' },
].map((trainer) => ({ ...trainer, isFallback: true }))

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = req.nextUrl
    const specialty = searchParams.get('specialty')
    const country = searchParams.get('country')
    const search = searchParams.get('search')
    const requestedLimit = parseInt(searchParams.get('limit') || '20')
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 20
    const featured = searchParams.get('featured')

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

    const trainers = await Trainer.find(query).limit(limit).lean()

    // Always return data — use fallback if DB is empty
    if (trainers.length === 0) {
      let fallback = FALLBACK_TRAINERS
      if (specialty) fallback = fallback.filter(t => t.specialty.some(s => s.toLowerCase().includes(specialty.toLowerCase())))
      if (country) fallback = fallback.filter(t => t.country.toLowerCase().includes(country.toLowerCase()))
      if (search) fallback = fallback.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.bio.toLowerCase().includes(search.toLowerCase()))
      if (featured) fallback = fallback.filter(t => t.isFeatured)
      return NextResponse.json(fallback.slice(0, limit))
    }

    return NextResponse.json(trainers)
  } catch (error) {
    console.error('Trainers error:', error)
    // Even on DB error, return fallback data so page is never empty
    return NextResponse.json(FALLBACK_TRAINERS)
  }
}
