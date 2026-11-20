import type { NextConfig } from 'next'
import path from 'path'
import { OPTIMIZED_IMAGE_HOSTS } from './src/lib/image-optimization'

const projectRoot = path.resolve(__dirname)

const nextConfig: NextConfig = {
  // Allows verification to use a separate, workspace-local build directory.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Parent lockfile at C:\Users\al rafio\package-lock.json otherwise becomes Turbopack root.
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: OPTIMIZED_IMAGE_HOSTS.map(hostname => ({ protocol: 'https' as const, hostname })),
    qualities: [75],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      // Next.js / MediaPipe need inline + eval; map APIs and optional Daily embeds are allowed.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/ https://js.stripe.com https://*.daily.co https://maps.googleapis.com https://maps.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss: ws:",
      "media-src 'self' blob: https:",
      "frame-src 'self' https://js.stripe.com https://meet.jit.si https://*.daily.co https://*.stripe.com https://www.google.com https://maps.google.com https://www.openstreetmap.org",
      "worker-src 'self' blob:",
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          // Same-origin app; avoid wildcard CORS with credentialed cookies.
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      {
        // Public handlers choose caching per response, including uncached errors/fallbacks.
        source: '/api/:path((?!exercises(?:/[^/]+/preview)?$|meals$|trainers$|gyms$).*)',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' }],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/pricing',
        destination: '/subscription',
        permanent: true,
      },
      {
        source: '/progress',
        destination: '/my-fitness',
        permanent: false,
      },
      {
        source: '/workout-plans',
        destination: '/my-fitness',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
