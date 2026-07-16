import type { NextConfig } from 'next'
import path from 'path'

const projectRoot = path.resolve(__dirname)

const nextConfig: NextConfig = {
  // Parent lockfile at C:\Users\al rafio\package-lock.json otherwise becomes Turbopack root.
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'randomuser.me' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'media1.tenor.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'www.themealdb.com' },
      { protocol: 'https', hostname: 'static.exercisedb.dev' },
    ],
    unoptimized: true,
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      // Next.js / MediaPipe need inline + eval in places; tighten further with nonces later.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss: ws:",
      "media-src 'self' blob: https:",
      "frame-src 'self' https://js.stripe.com https://meet.jit.si https://*.stripe.com",
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
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          // Same-origin app; avoid wildcard CORS with credentialed cookies.
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
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
