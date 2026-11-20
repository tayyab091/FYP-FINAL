'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import type { PublicGym } from '@/lib/gyms'
import { gymMapSource } from '@/lib/gym-map'

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
  const osmLocation = selectedGym?.source === 'osm' ? selectedGym.location : undefined
  const src = gymMapSource(selectedGym, center, publicKey)
  const [loadedSource, setLoadedSource] = useState('')

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border bg-muted ${className}`}>
      <iframe
        title={selectedGym ? `${selectedGym.name} on ${osmLocation ? 'OpenStreetMap' : 'Google Maps'}` : center ? 'Nearby gyms on Google Maps' : 'COMSATS University Lahore campus map'}
        src={src}
        onLoad={() => setLoadedSource(src)}
        className="h-full min-h-[22rem] w-full border-0 grayscale-[.15] contrast-[1.03]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      {loadedSource !== src && (
        <div role="status" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted text-muted-foreground">
          <MapPin className="size-8 animate-pulse text-primary" />
          <span className="text-xs">Loading map…</span>
        </div>
      )}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-xl">
        <MapPin className="size-3.5 text-primary" /> {osmLocation ? 'OpenStreetMap' : 'Google Maps'}
      </div>
    </div>
  )
}
