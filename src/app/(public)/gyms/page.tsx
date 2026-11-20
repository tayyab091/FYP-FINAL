'use client'
import { PagePhoto } from '@/components/shared/PagePhoto'

import Image from '@/components/shared/OptimizedImage'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Building2, Check, Info, LocateFixed, MapPin, RotateCcw, Search, Star, Users } from 'lucide-react'
import { GoogleGymMap } from '@/components/gyms/GoogleGymMap'
import { GymTrainers } from '@/components/gyms/GymTrainers'
import type { PublicGym } from '@/lib/gyms'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { distanceKm } from '@/lib/location'
import { usePublicData } from '@/hooks/usePublicData'
import { mergeNearbyGyms } from '@/lib/gym-discovery'
import { useGymGooglePhoto } from '@/hooks/useGymGooglePhoto'
import { GoogleBrand, GooglePhotoAttribution } from '@/components/gyms/GooglePhotoAttribution'

const CITIES = ['All cities', 'Lahore', 'Karachi', 'Islamabad']

function GymCard({ gym, selected, onSelect, distance, driving }: {
  gym: PublicGym; selected: boolean; onSelect: () => void; distance?: number; driving?: boolean
}) {
  const [failedImages, setFailedImages] = useState<string[]>([])
  const photo = useGymGooglePhoto(gym)
  const image = photo && !failedImages.includes(photo.url) ? photo.url : gym.coverImage
  const external = gym.source !== 'test'
  const href = external ? gym.osmUri || gym.googleMapsUri || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(gym.name + ' ' + gym.address) + '&query_place_id=' + encodeURIComponent(gym.googlePlaceId || '') : '/gyms/' + gym.slug
  return (
    <article className={'overflow-hidden rounded-2xl border bg-card transition duration-200 ' + (selected ? 'border-primary/50 shadow-[0_8px_30px_rgba(16,185,129,.08)]' : 'border-border hover:border-primary/30')}>
      <div className="grid sm:grid-cols-[11rem_minmax(0,1fr)]">
        <Link href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
          aria-label={'View ' + gym.name} className="group relative block min-h-44 overflow-hidden bg-muted sm:min-h-full">
          {image && !failedImages.includes(image) ? (
            <Image src={image} alt={gym.name} fill unoptimized={Boolean(photo)} sizes="(max-width: 640px) 100vw, 176px"
              onError={() => setFailedImages(current => [...current, image])} className={(image === gym.logo ? 'object-contain p-4' : 'object-cover') + ' transition duration-500 group-hover:scale-105'} />
          ) : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-primary/5 text-primary/50"><Building2 className="size-10" strokeWidth={1} /><span className="text-[10px] text-muted-foreground">No photo available</span></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          {gym.verificationStatus === 'verified' && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-lg bg-background/95 px-2 py-1 text-[10px] font-bold text-foreground shadow-sm">
              <Check className="size-3 text-primary" /> Verified
            </span>
          )}
        </Link>
        <div className="flex min-w-0 flex-col p-5">
          <span className={'mb-3 w-fit rounded-lg border px-2 py-1 text-[10px] font-bold ' + (external ? 'border-border text-muted-foreground' : 'border-primary/30 bg-primary/10 text-primary')}>{external ? (gym.source === 'osm' ? 'OpenStreetMap · not registered' : 'Google listing · not registered') : gym.id.startsWith('preview-') ? 'Demo listing' : 'Registered on T.E.S.T.'}</span>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-muted-foreground">{gym.city || gym.country}{distance !== undefined ? ' - ' + distance.toFixed(1) + (driving ? ' km drive' : ' km straight-line') : ''}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Star className="size-3.5 fill-amber-400 text-amber-500" />
              {gym.source === 'osm' ? 'Unrated' : gym.rating ? gym.rating.toFixed(1) : 'New'}
              {gym.reviewsCount > 0 && <span className="font-normal text-muted-foreground">({gym.reviewsCount})</span>}
            </span>
          </div>
          <Link href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
            className="w-fit text-xl font-bold tracking-tight text-foreground hover:text-primary">
            <h3>{gym.name}</h3>
          </Link>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" /><span>{gym.address}</span>
          </p>
          {gym.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{gym.description}</p>}
          {gym.facilities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {gym.facilities.slice(0, 3).map(facility => <span key={facility} className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">{facility}</span>)}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={'Show ' + gym.name + ' on map'}
              className={'inline-flex items-center gap-1.5 text-xs font-semibold transition hover:text-primary ' + (selected ? 'text-primary' : 'text-muted-foreground')}>
              <MapPin className="size-3.5" /> {selected ? 'Selected on map' : 'Show on map'}
            </button>
            <Link href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              {external ? (gym.source === 'osm' ? 'View on OpenStreetMap' : 'View on Google Maps') : 'View gym'} <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          {gym.trainersCount > 0 && <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Users className="size-3" /> {gym.trainersCount} trainers available</span>}
          <GymTrainers trainers={gym.trainers} compact />
          {photo && image === photo.url && !failedImages.includes(photo.url) && <div className="mt-3"><GooglePhotoAttribution photo={photo} mapsUri={gym.googleMapsUri || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(gym.name) + '&query_place_id=' + encodeURIComponent(gym.googlePlaceId || '')} /></div>}
        </div>
      </div>
    </article>
  )
}

export default function GymsPage() {
  const publicData = usePublicData()
  const { user } = useAuth()
  const [registeredGyms, setGyms] = useState<PublicGym[]>([])
  const [discoveredGyms, setDiscoveredGyms] = useState<PublicGym[]>([])
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [discoveryNotice, setDiscoveryNotice] = useState('')
  const [discoveryProvider, setDiscoveryProvider] = useState<'google' | 'osm'>('osm')
  const [listingType, setListingType] = useState('all')
  const [radius, setRadius] = useState(10)
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
      if (center) {
        params.set('lat', String(center.latitude))
        params.set('lng', String(center.longitude))
        params.set('radius', String(radius))
      }
      const data = await publicData<{ gyms?: PublicGym[] }>(`/api/gyms?${params}`, signal)
      setGyms(Array.isArray(data.gyms) ? data.gyms : [])
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setLoadError('Gym listings could not be refreshed. Check your connection and try again.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [city, search, publicData, center, radius])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => void loadMarketplace(controller.signal), 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [loadMarketplace])

  useEffect(() => {
    setDiscoveredGyms([])
    setDiscoveryNotice('')
    if (!center) { setDiscoveryLoading(false); return }
    const controller = new AbortController()
    setDiscoveryLoading(true)
    const params = new URLSearchParams({ lat: String(center.latitude), lng: String(center.longitude), radius: String(radius * 1000) })
    void fetch('/api/gyms/nearby?' + params, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(18_000)]), cache: 'no-store' }).then(async response => {
      const data = await response.json()
      if (controller.signal.aborted) return
      if (!response.ok) {
        setDiscoveryNotice('Showing registered gyms. Nearby map listings are temporarily unavailable.')
        return
      }
      setDiscoveredGyms(Array.isArray(data.places) ? data.places : [])
      setDiscoveryProvider(data.provider === 'google' ? 'google' : 'osm')
      setDiscoveryNotice(typeof data.notice === 'string' ? data.notice : '')
    }).catch(() => {
      if (!controller.signal.aborted) setDiscoveryNotice('Showing registered gyms. Nearby map listings could not be refreshed.')
    }).finally(() => { if (!controller.signal.aborted) setDiscoveryLoading(false) })
    return () => controller.abort()
  }, [center, radius])

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
      setSelectedId(null)
      setCity('All cities')
      setListingType('all')
      setNearbyNotice('')
      setLocating(false)
      document.getElementById('gym-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    }, () => {
      setLocating(false)
      setNearbyNotice('Location permission was not granted. Search by city instead.')
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
  }

  const candidates = useMemo(() => {
    const combined = center ? mergeNearbyGyms(registeredGyms, discoveredGyms, center, radius) : registeredGyms
    const needle = search.trim().toLowerCase()
    return combined.filter(gym =>
      (listingType === 'all' || (listingType === 'external' ? gym.source !== 'test' : gym.source === 'test')) &&
      (!needle || [gym.name, gym.address, gym.city, ...gym.facilities].some(value => value.toLowerCase().includes(needle))) &&
      (city === 'All cities' || gym.city.toLowerCase() === city.toLowerCase() || gym.address.toLowerCase().includes(city.toLowerCase())),
    )
  }, [registeredGyms, discoveredGyms, center, radius, search, listingType, city])
  const routeKey = JSON.stringify(center ? { origin: center, destinations: candidates.map(gym => gym.location) } : null)
  const [routing, setRouting] = useState<{ key: string; distances?: (number | null)[] }>({ key: '' })
  useEffect(() => {
    if (!center || !candidates.length) return
    const controller = new AbortController()
    void fetch('/api/gyms/distances', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: routeKey,
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Routing unavailable')
      const data = await response.json()
      if (!controller.signal.aborted) setRouting({ key: routeKey,
        distances: data.provider === 'google' && Array.isArray(data.distances) && data.distances.length === candidates.length ? data.distances : undefined })
    }).catch(() => { if (!controller.signal.aborted) setRouting({ key: routeKey }) })
    return () => controller.abort()
  }, [routeKey, center, candidates.length])
  const driving = routing.key === routeKey && Boolean(routing.distances)
  const routeLoading = Boolean(center && candidates.length && routing.key !== routeKey)
  const distanceFor = (gym: PublicGym) => driving
    ? routing.distances?.[candidates.indexOf(gym)] ?? undefined
    : center && gym.location ? distanceKm(center, gym.location) : undefined
  const gyms = driving ? candidates.filter(gym => {
    const distance = distanceFor(gym)
    return distance !== undefined && distance <= radius
  }).sort((a, b) => distanceFor(a)! - distanceFor(b)!) : candidates
  const selectedGym = useMemo(
    () => gyms.find((gym) => gym.id === selectedId) || null,
    [gyms, selectedId],
  )

  const selectGym = (id: string) => {
    setSelectedId(id)
    if (window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('gym-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const resetFilters = () => {
    setSearch('')
    setCity('All cities')
    setCenter(null)
    setRadius(10)
    setSelectedId(null)
    setNearbyNotice('')
    setListingType('all')
  }
  const hasFilters = Boolean(search || city !== 'All cities' || center)

  return (
    <div className={'min-h-screen pb-24 ' + (user?.role === 'user' ? 'pt-8' : 'pt-24')}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="page-hero fitness-photo-hero mb-7 flex flex-wrap items-end justify-between gap-4 px-6 py-6 sm:px-8">
          <PagePhoto kind="gym" />
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-primary">Find Gyms</p>
            <h1 className="display-title max-w-3xl text-3xl text-foreground sm:text-4xl">Find your training ground</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Explore spaces, compare facilities, and find a gym that fits your routine.</p>
          </div>
          <a href="#gym-map" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/40 lg:hidden">
            <MapPin className="size-4 text-primary" /> View map
          </a>
        </div>

        <section aria-label="Filter gyms" className="mb-7 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1fr)_10rem_8rem_auto]">
            <label className="col-span-2 block lg:col-span-1">
              <span className="mb-2 block text-[11px] font-semibold text-muted-foreground">Search</span>
              <span className="relative block">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={event => setSearch(event.target.value)} aria-label="Search gyms" placeholder="Gym name, facility, or area"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold text-muted-foreground">City</span>
              <select aria-label="Filter gyms by city" value={city} onChange={event => setCity(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary">
                {CITIES.map(option => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold text-muted-foreground">Radius</span>
              <select aria-label="Gym distance radius" value={radius} onChange={event => setRadius(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary">
                {[2, 5, 10, 25, 50].map(value => <option key={value} value={value}>{value} km</option>)}
              </select>
            </label>
            <div className="col-span-2 flex items-end lg:col-span-1">
              <Button type="button" onClick={findNearby} disabled={locating} variant={center ? 'default' : 'outline'} className="h-11 w-full gap-2 rounded-xl px-5">
                <LocateFixed className="size-4" /> {locating ? 'Finding gyms...' : 'Use my location'}
              </Button>
            </div>
          </div>
          {center && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><label className="flex items-center gap-2 text-xs text-muted-foreground">Listings<select aria-label="Gym registration filter" value={listingType} onChange={event => setListingType(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"><option value="all">All nearby gyms</option><option value="registered">Registered on T.E.S.T.</option><option value="external">Map listings · not registered</option></select></label><span className="max-w-md text-xs text-muted-foreground">Registered profiles and {discoveryProvider === 'google' ? 'up to 20 Google results' : 'up to 200 community-mapped gyms'} within {radius} km. Map coverage may be incomplete.</span><a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('gyms near ' + center.latitude + ',' + center.longitude)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary underline">Explore more on Google Maps</a></div>}
          {(hasFilters || nearbyNotice) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                {center ? <LocateFixed className="size-3.5 text-primary" /> : <Info className="size-3.5" />}
                {nearbyNotice || (center ? 'Within ' + radius + (driving ? ' km driving distance (Google Routes)' : ' km straight-line radius; road distances may be longer') : 'Filters applied')}
              </p>
              <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><RotateCcw className="size-3" /> Reset filters</button>
            </div>
          )}
        </section>

        {center && discoveryNotice && <p role="status" className="mb-5 text-xs text-muted-foreground">{discoveryNotice}</p>}
        {center && discoveredGyms.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{discoveryProvider === 'google' ? <><GoogleBrand /><span>Google ratings belong to Google listings; registered profiles show T.E.S.T. reviews.</span></> : <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">© OpenStreetMap contributors · Open Database License</a>}</div>}

        {loadError && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            <span>{loadError}</span>
            <button type="button" onClick={() => void loadMarketplace()} className="font-semibold text-primary hover:underline">Retry</button>
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
          <section aria-label="Gym results" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-foreground">{center ? 'Gyms near you' : city === 'All cities' ? 'Explore gyms' : 'Gyms in ' + city}</h2>
              <span aria-live="polite" className="text-xs text-muted-foreground">{loading || discoveryLoading || routeLoading ? 'Finding gyms...' : gyms.length + (gyms.length === 1 ? ' gym found' : ' gyms found')}</span>
            </div>
            {loading || routeLoading ? (
              <div aria-busy="true" aria-label="Loading gym listings" className="space-y-4">
                {[1, 2, 3].map(item => <div key={item} className="skeleton h-60 rounded-2xl" />)}
              </div>
            ) : gyms.length ? (
              <div className="space-y-4">
                {gyms.map(gym => <GymCard key={gym.source + '-' + gym.id} gym={gym} selected={selectedGym?.id === gym.id}
                  distance={distanceFor(gym)} driving={driving}
                  onSelect={() => selectGym(gym.id)} />)}
              </div>
            ) : <EmptyState icon={<Building2 className="size-7" />} tagline="No matches" title="No gyms found" description="Try another city, a larger radius, or a broader search." />}
          </section>

          <aside id="gym-map" aria-label="Gym map" className="scroll-mt-24 lg:sticky lg:top-24">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-foreground"><span className="inline-flex items-center gap-2"><MapPin className="size-4 text-primary" />{selectedGym ? 'Selected gym' : center ? 'Gyms near your location' : 'COMSATS Lahore area'}</span>{selectedGym && <button type="button" onClick={() => setSelectedId(null)} className="text-xs text-primary underline">{center ? 'Show nearby gyms on map' : 'Reset map'}</button>}</div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <GoogleGymMap selectedGym={selectedGym} center={center} className="h-[22rem] !rounded-none !border-0 sm:h-[27rem]" />
              {selectedGym && (
                <div className="space-y-2 border-t border-border p-5">
                  <h2 className="text-base font-bold text-foreground">{selectedGym.name}</h2>
                  <p className="text-xs leading-relaxed text-muted-foreground">{selectedGym.address}</p>
                  <a href={selectedGym.osmUri || selectedGym.googleMapsUri || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(selectedGym.name + ' ' + selectedGym.address)} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    Open in {selectedGym.source === 'osm' ? 'OpenStreetMap' : 'Google Maps'} <ArrowUpRight className="size-3.5" />
                  </a>

                </div>
              )}
              {!selectedGym && <div className="space-y-2 border-t border-border p-5"><p className="text-xs text-muted-foreground">{center ? 'The map searches for gyms around your current location, including gyms outside T.E.S.T.' : 'Centred on COMSATS University Lahore. Choose a gym to view it on the map.'}</p><a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(center ? 'gyms near ' + center.latitude + ',' + center.longitude : 'COMSATS University Lahore Defence Road')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline">{center ? 'Open nearby gyms in Google Maps' : 'Open campus area in Google Maps'}<ArrowUpRight className="size-3.5" /></a></div>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
