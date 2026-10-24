'use client'

import { MapPin } from 'lucide-react'
import type { PublicGym } from '@/lib/gyms'

export function GoogleGymMap({
  selectedGym,
  center,
  className = '',
}: {
  selectedGym?: PublicGym | null
  center?: { latitude: number; longitude: number } | null
  className?: string
}) {
  const publicKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const query = selectedGym?.address
    || (center ? `gyms near ${center.latitude},${center.longitude}` : 'gyms in Pakistan')
  const src = publicKey
    ? `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(publicKey)}&q=${encodeURIComponent(query)}`
    : `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/[.09] bg-[#0b0f0c] ${className}`}>
      <iframe
        title={selectedGym ? `${selectedGym.name} on Google Maps` : 'Nearby gyms on Google Maps'}
        src={src}
        className="h-full min-h-[22rem] w-full border-0 grayscale-[.15] contrast-[1.03]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-xl">
        <MapPin className="size-3.5 text-primary" /> Google Maps
      </div>
    </div>
  )
}
