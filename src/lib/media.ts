import { slugify } from '@/lib/slug'

const DEFAULT_GYM_IMAGES = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1570829460005-c840387bb1ca?auto=format&fit=crop&w=1400&q=80',
]

function cloudName(): string | undefined {
  const direct = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME
  if (direct?.trim()) return direct.trim()
  const match = process.env.CLOUDINARY_URL?.trim().match(/^cloudinary:\/\/[^@]+@([^/?#]+)/)
  return match?.[1]
}

/** Return a resized, format-optimized Cloudinary delivery URL when possible. */
export function optimizeImageUrl(url: string, width = 1400): string {
  const value = url.trim()
  if (!value.includes('res.cloudinary.com') || !value.includes('/upload/')) return value
  if (/\/upload\/[^/]*f_auto/.test(value)) return value
  return value.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
}

/** Generate stable default gallery URLs for gyms without uploaded images. */
export function defaultGymGallery(name: string, city = ''): string[] {
  const seed = slugify(`${name}-${city}`)
  const offset = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % DEFAULT_GYM_IMAGES.length
  const images = [0, 1, 2].map((index) => DEFAULT_GYM_IMAGES[(offset + index) % DEFAULT_GYM_IMAGES.length])
  const cloud = cloudName()
  if (!cloud) return images
  return images.map((image) => `https://res.cloudinary.com/${cloud}/image/fetch/f_auto,q_auto,w_1400/${encodeURIComponent(image)}`)
}
