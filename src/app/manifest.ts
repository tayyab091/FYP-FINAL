import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'T.E.S.T.',
    short_name: 'TEST',
    description: "Pakistan's first AI-powered fitness coaching platform. Connect with verified trainers, track nutrition, and achieve your fitness goals.",
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
