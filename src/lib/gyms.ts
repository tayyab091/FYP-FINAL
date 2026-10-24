import { createPublicSlug, slugify } from '@/lib/slug'

export interface PublicGym {
  id: string
  slug: string
  name: string
  address: string
  city: string
  country: string
  description: string
  phone?: string
  email?: string
  logo?: string
  coverImage?: string
  images: string[]
  facilities: string[]
  trainersCount: number
  rating: number
  reviewsCount: number
  verificationStatus: 'pending' | 'verified' | 'rejected'
  location?: { latitude: number; longitude: number }
  googleMapsUri?: string
  source: 'test' | 'google'
}

const previewData: Omit<PublicGym, 'slug'>[] = [
  {
    id: 'preview-gym-lahore',
    name: 'FitZone Lahore',
    address: 'Gulberg III, Lahore',
    city: 'Lahore',
    country: 'Pakistan',
    description: 'A full-service strength and conditioning gym with coached sessions, cardio, and dedicated women-only hours.',
    phone: '+92 300 0000001',
    coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
    images: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1000&q=80',
    ],
    facilities: ['Strength floor', 'Cardio zone', 'Personal training', 'Changing rooms'],
    trainersCount: 8,
    rating: 4.8,
    reviewsCount: 126,
    verificationStatus: 'verified',
    location: { latitude: 31.5204, longitude: 74.3587 },
    source: 'test',
  },
  {
    id: 'preview-gym-karachi',
    name: 'Elite Fitness Karachi',
    address: 'Clifton, Karachi',
    city: 'Karachi',
    country: 'Pakistan',
    description: 'Premium training spaces, group classes, and evidence-led coaching for beginners through advanced athletes.',
    phone: '+92 300 0000002',
    coverImage: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1400&q=80',
    images: [
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1000&q=80',
    ],
    facilities: ['Group classes', 'Functional training', 'Yoga studio', 'Showers'],
    trainersCount: 11,
    rating: 4.7,
    reviewsCount: 203,
    verificationStatus: 'verified',
    location: { latitude: 24.8138, longitude: 67.0305 },
    source: 'test',
  },
  {
    id: 'preview-gym-islamabad',
    name: 'Capital Strength Club',
    address: 'F-7 Markaz, Islamabad',
    city: 'Islamabad',
    country: 'Pakistan',
    description: 'A friendly performance gym focused on progressive strength training, mobility, and sustainable habits.',
    phone: '+92 300 0000003',
    coverImage: 'https://images.unsplash.com/photo-1570829460005-c840387bb1ca?auto=format&fit=crop&w=1400&q=80',
    images: [
      'https://images.unsplash.com/photo-1570829460005-c840387bb1ca?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1000&q=80',
    ],
    facilities: ['Free weights', 'Mobility area', 'Nutrition consults', 'Parking'],
    trainersCount: 6,
    rating: 4.9,
    reviewsCount: 89,
    verificationStatus: 'verified',
    location: { latitude: 33.7215, longitude: 73.0433 },
    source: 'test',
  },
]

export const PREVIEW_GYMS: PublicGym[] = previewData.map((gym) => ({
  ...gym,
  slug: slugify(gym.name),
}))

export function inferCity(address: string): string {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean)
  return parts.length > 1 ? parts.at(-2)! : parts[0] || 'Pakistan'
}

export function normalizeGym(doc: Record<string, unknown>): PublicGym {
  const rawId = String(doc._id || doc.id || '')
  const name = String(doc.name || 'Gym')
  const address = String(doc.address || '')
  const rawLocation = doc.location as { coordinates?: number[] } | undefined
  const coordinates = rawLocation?.coordinates
  const images = Array.isArray(doc.images) ? doc.images.map(String).filter(Boolean) : []
  const coverImage = String(doc.coverImage || doc.logo || images[0] || '') || undefined

  return {
    id: rawId,
    slug: String(doc.slug || createPublicSlug(name, rawId)),
    name,
    address,
    city: String(doc.city || inferCity(address)),
    country: String(doc.country || 'Pakistan'),
    description: String(doc.description || 'Verified gym on the T.E.S.T. fitness network.'),
    phone: doc.phone ? String(doc.phone) : undefined,
    email: doc.email ? String(doc.email) : undefined,
    logo: doc.logo ? String(doc.logo) : undefined,
    coverImage,
    images: images.length ? images : coverImage ? [coverImage] : [],
    facilities: Array.isArray(doc.facilities) ? doc.facilities.map(String).filter(Boolean) : [],
    trainersCount: Array.isArray(doc.trainers) ? doc.trainers.length : Number(doc.trainersCount || 0),
    rating: Number(doc.rating || 0),
    reviewsCount: Number(doc.reviewsCount || 0),
    verificationStatus: (doc.verificationStatus as PublicGym['verificationStatus']) || 'pending',
    location: Array.isArray(coordinates) && coordinates.length === 2
      ? { latitude: Number(coordinates[1]), longitude: Number(coordinates[0]) }
      : undefined,
    source: 'test',
  }
}
