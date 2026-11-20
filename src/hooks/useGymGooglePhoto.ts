'use client'
import { useQuery } from '@tanstack/react-query'
import type { PublicGym } from '@/lib/gyms'

export function useGymGooglePhoto(gym: PublicGym | null) {
  const query = useQuery({
    queryKey: ['gym-google-photo', gym?.id, gym?.googlePlaceId],
    enabled: Boolean(gym?.googlePlaceId && gym.source !== 'google'),
    staleTime: 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/gyms/google-photo?gymId=' + encodeURIComponent(gym!.id), { signal, cache: 'no-store' })
      if (!response.ok) return null
      const data = await response.json() as { photo?: PublicGym['googlePhoto'] }
      return data.photo || null
    },
  })
  return gym?.googlePhoto || query.data || undefined
}
