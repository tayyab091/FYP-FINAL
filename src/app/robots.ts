import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/trainer-dashboard/',
          '/gym-owner/',
          '/chat/',
          '/settings/',
          '/analytics/',
          '/community/',
          '/notifications/',
          '/live-sessions/',
          '/my-fitness/',
          '/meal-plans/',
          '/leaderboard/',
          '/api/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
