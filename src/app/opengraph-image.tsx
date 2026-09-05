import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo'

export const runtime = 'edge'

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to right, #000000, #1a1a1a)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: 'white',
        }}
      >
        <h1
          style={{
            fontSize: 100,
            fontWeight: 'bold',
            letterSpacing: '-0.05em',
            background: 'linear-gradient(to bottom right, #ffffff, #a3a3a3)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 20,
          }}
        >
          {SITE_NAME}
        </h1>
        <p
          style={{
            fontSize: 40,
            fontWeight: 500,
            color: '#a3a3a3',
            marginTop: 0,
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          {SITE_TAGLINE}
        </p>
      </div>
    ),
    {
      ...size,
    }
  )
}
