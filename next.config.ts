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
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
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
