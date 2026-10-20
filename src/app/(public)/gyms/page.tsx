'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Info, LocateFixed, MapPin, RotateCcw, Search, Star, Users } from 'lucide-react'
import { GoogleGymMap } from '@/components/gyms/GoogleGymMap'
import type { PublicGym } from '@/lib/gyms'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'

const CITIES = ['All cities', 'Lahore', 'Karachi', 'Islamabad']

function GymCard({ gym, selected, onSelect }: { gym: PublicGym; selected: boolean; onSelect: () => void }) {
  const content = (
    <article className={`elite-panel interactive-lift overflow-hidden rounded-2xl ${selected ? 'border-primary/45 ring-2 ring-primary/10' : ''}`}>
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary/15 to-sky-400/10">
        {gym.coverImage ? (
          <Image src={gym.coverImage} alt={gym.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-primary"><Building2 className="size-12" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-lg">
          {gym.source === 'google' ? 'Google nearby' : gym.verificationStatus === 'verified' ? 'Verified' : 'Listed'}
        </span>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <h2 className="truncate text-lg font-bold text-white">{gym.name}</h2>
          <p className="mt-1 flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span className="line-clamp-2 break-words">{gym.address}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-amber-300"><Star className="size-3.5 fill-current" /> {gym.rating ? gym.rating.toFixed(1) : 'New'}</span>
          {gym.trainersCount > 0 && <span className="inline-flex items-center gap-1 text-muted-foreground"><Users className="size-3.5" /> {gym.trainersCount} trainers</span>}
        </div>
        {gym.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {gym.facilities.slice(0, 3).map((facility) => (
              <span key={facility} className="rounded-full bg-primary/[.08] px-2 py-1 text-[10px] font-semibold text-primary">{facility}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  )

  if (gym.source === 'google' && gym.googleMapsUri) {
    return <a href={gym.googleMapsUri} target="_blank" rel="noreferrer" onMouseEnter={onSelect} onFocus={onSelect}>{content}</a>
  }
  return <Link href={`/gyms/${gym.slug}`} onMouseEnter={onSelect} onFocus={onSelect}>{content}</Link>
}

export default function GymsPage() {
  const [gyms, setGyms] = useState<PublicGym[]>([])
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('All cities')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [locating, setLocating] = useState(false)
  const [nearbyNotice, setNearbyNotice] = useState('')
  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadMarketplace = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (city !== 'All cities') params.set('city', city)
      const response = await fetch(`/api/gyms?${params}`, { signal })
      if (!response.ok) throw new Error('Unable to load gym listings')
      const data = await response.json()
      setGyms(Array.isArray(data.gyms) ? data.gyms : [])
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setLoadError('Gym listings could not be refreshed. Check your connection and try again.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [city, search])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => void loadMarketplace(controller.signal), 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [loadMarketplace])

  const findNearby = () => {
    if (!navigator.geolocation) {
      setNearbyNotice('Location is not supported by this browser.')
      return
    }
    setLocating(true)
    setNearbyNotice('')
    navigator.geolocation.getCurrentPosition(async (position) => {
      const nextCenter = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      setCenter(nextCenter)
      try {
        const response = await fetch(`/api/gyms/nearby?lat=${nextCenter.latitude}&lng=${nextCenter.longitude}&radius=10000`)
        const data = await response.json()
        const nearby = Array.isArray(data.places) ? data.places as PublicGym[] : []
        if (response.ok && nearby.length) {
          setGyms((current) => {
            const seen = new Set(nearby.map((gym) => gym.id))
            return [...nearby, ...current.filter((gym) => !seen.has(gym.id))]
          })
          setNearbyNotice(`${nearby.length} live Google Places results added.`)
        } else {
          setNearbyNotice(data.configured === false
            ? 'Local listings are shown. Add GOOGLE_MAPS_API_KEY to enable live nearby search.'
            : 'No additional nearby gyms were found.')
        }
      } catch {
        setNearbyNotice('Nearby search is temporarily unavailable; local listings are still shown.')
      } finally {
        setLocating(false)
      }
    }, () => {
      setLocating(false)
      setNearbyNotice('Location permission was not granted. Search by city instead.')
    }, { enableHighAccuracy: false, timeout: 8000 })
  }

  const selectedGym = useMemo(
    () => gyms.find((gym) => gym.id === selectedId) || gyms[0] || null,
    [gyms, selectedId],
  )

  return (
    <div className="min-h-screen pb-24 pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="page-hero gym-floor mb-8 px-6 py-10 sm:px-10 md:py-14">
          <p className="eyebrow mb-3">Gym Marketplace</p>
          <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <h1 className="display-title max-w-3xl text-4xl text-white md:text-6xl">Find your training ground</h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">Compare verified gyms, explore facilities, and use Google Places to discover options around you.</p>
            </div>
            <Button type="button" onClick={findNearby} disabled={locating} className="gap-2">
              <LocateFixed className="size-4" /> {locating ? 'Finding gyms…' : 'Use my location'}
            </Button>
          </div>
        </section>

        <div className="elite-panel mb-6 grid gap-3 p-4 md:grid-cols-[1fr_12rem]">
          <label className="relative">
            <span className="sr-only">Search gyms</span>
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search gym, facility, or area…" className="h-12 w-full rounded-xl border border-white/[.09] bg-black/25 pl-11 pr-4 text-sm outline-none focus:border-primary/45" />
          </label>
          <label>
            <span className="sr-only">Filter gyms by city</span>
            <select value={city} onChange={(event) => setCity(event.target.value)} className="h-12 w-full rounded-xl border border-white/[.09] bg-black/25 px-4 text-sm outline-none focus:border-primary/45">
              {CITIES.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>

        {nearbyNotice && (
          <p role="status" aria-live="polite" className="mb-5 flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0 text-primary" /> {nearbyNotice}
          </p>
        )}

        {loadError && (
          <div role="alert" className="mb-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center">
            <span>{loadError}</span>
            <button type="button" onClick={() => void loadMarketplace()} className="inline-flex shrink-0 items-center gap-1.5 font-bold text-primary hover:underline">
              <RotateCcw className="size-3.5" /> Retry
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,.9fr)]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{city === 'All cities' ? 'Recommended gyms' : `Gyms in ${city}`}</h2>
              <span aria-live="polite" className="text-xs text-muted-foreground">{gyms.length} results</span>
            </div>
            {loading ? (
              <div aria-busy="true" aria-label="Loading gym listings" className="grid gap-4 sm:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-72 rounded-2xl" />)}</div>
            ) : gyms.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {gyms.map((gym) => <GymCard key={`${gym.source}-${gym.id}`} gym={gym} selected={selectedGym?.id === gym.id} onSelect={() => setSelectedId(gym.id)} />)}
              </div>
            ) : (
              <EmptyState icon={<Building2 className="size-7" />} tagline="No matches" title="No gyms found" description="Try another city or a broader search term." />
            )}
          </div>
          <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
            <GoogleGymMap selectedGym={selectedGym} center={center} className="h-full" />
          </aside>
        </div>
      </div>
    </div>
  )
}
