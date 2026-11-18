export const OPTIMIZED_IMAGE_HOSTS = [
  'randomuser.me', 'images.unsplash.com', 'upload.wikimedia.org',
  'media1.tenor.com', 'res.cloudinary.com', 'www.themealdb.com', 'static.exercisedb.dev',
]

/** Preserve animations and allow existing user-supplied image URLs to render. */
export function bypassImageOptimization(src: string): boolean {
  if (/\.(?:gif|svg)(?:[?#]|$)/i.test(src) || /^(?:data:|blob:)/i.test(src)) return true
  if (src.startsWith('/') && !src.startsWith('//')) return false
  try {
    const url = new URL(src)
    return url.protocol !== 'https:' || !OPTIMIZED_IMAGE_HOSTS.includes(url.hostname)
  } catch {
    return true
  }
}
