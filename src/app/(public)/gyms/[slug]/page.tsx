'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Building2, CheckCircle2, Mail, MapPin, Phone, RotateCcw, Star, Users } from 'lucide-react'
import { GoogleGymMap } from '@/components/gyms/GoogleGymMap'
import type { PublicGym } from '@/lib/gyms'
import { PageLoader } from '@/components/shared/PageLoader'

export default function GymDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [gym, setGym] = useState<PublicGym | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!slug) return
    const controller = new AbortController()
    const loadGym = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const response = await fetch(`/api/gyms/${encodeURIComponent(slug)}`, { signal: controller.signal })
        if (response.status === 404) {
          setGym(null)
          return
        }
        if (!response.ok) throw new Error('Unable to load gym')
        setGym(await response.json())
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setGym(null)
          setLoadError('This gym profile is temporarily unavailable.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadGym()
    return () => controller.abort()
  }, [attempt, slug])

  if (loading) return <PageLoader />
  if (!gym) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-24 text-center">
        <div>
          <Building2 className="mx-auto mb-4 size-10 text-primary" />
          <h1 className="text-2xl font-bold">{loadError ? 'Unable to load gym' : 'Gym not found'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError || 'The listing may have moved or is no longer available.'}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {loadError && <button type="button" onClick={() => setAttempt((value) => value + 1)} className="btn-accent gap-2 px-5 py-2.5 text-sm"><RotateCcw className="size-4" /> Try again</button>}
            <Link href="/gyms" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold text-primary"><ArrowLeft className="size-4" /> Gym marketplace</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 pt-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Link href="/gyms" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> All gyms</Link>

        <section className="elite-panel overflow-hidden rounded-3xl">
          <div className="relative h-64 bg-gradient-to-br from-primary/15 to-sky-400/10 sm:h-80">
            {gym.coverImage ? <Image src={gym.coverImage} alt={gym.name} fill priority sizes="100vw" className="object-cover" /> : <div className="flex h-full items-center justify-center"><Building2 className="size-16 text-primary" /></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080b09] via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <div className="mb-3 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/15 px-3 py-1 text-xs font-bold text-primary"><CheckCircle2 className="size-3.5" /> Verified gym</span></div>
              <h1 className="display-title text-3xl text-white sm:text-5xl">{gym.name}</h1>
              <p className="mt-3 flex items-start gap-2 text-sm text-white/75"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /> {gym.address}</p>
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/[.035] p-4"><Star className="mb-2 size-4 text-amber-300" /><div className="text-xl font-black">{gym.rating ? gym.rating.toFixed(1) : 'New'}</div><p className="text-[11px] text-muted-foreground">{gym.reviewsCount} reviews</p></div>
                <div className="rounded-2xl bg-white/[.035] p-4"><Users className="mb-2 size-4 text-primary" /><div className="text-xl font-black">{gym.trainersCount}</div><p className="text-[11px] text-muted-foreground">Trainers</p></div>
                <div className="rounded-2xl bg-white/[.035] p-4"><Building2 className="mb-2 size-4 text-sky-300" /><div className="truncate text-base font-black">{gym.city || 'Pakistan'}</div><p className="text-[11px] text-muted-foreground">Location</p></div>
              </div>

              <div><p className="eyebrow mb-2">About</p><h2 className="text-2xl font-bold">Built for consistent progress</h2><p className="mt-3 max-w-3xl break-words leading-relaxed text-muted-foreground">{gym.description}</p></div>

              {gym.facilities.length > 0 && <div><h2 className="mb-4 text-xl font-bold">Facilities</h2><div className="grid gap-2 sm:grid-cols-2">{gym.facilities.map((facility) => <div key={facility} className="flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3 text-sm"><CheckCircle2 className="size-4 text-primary" /> {facility}</div>)}</div></div>}

              {gym.images.length > 1 && <div><h2 className="mb-4 text-xl font-bold">Inside the gym</h2><div className="grid gap-3 sm:grid-cols-2">{gym.images.slice(1, 5).map((image, index) => <div key={image} className="relative h-48 overflow-hidden rounded-2xl bg-muted"><Image src={image} alt={`${gym.name} facility ${index + 1}`} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" /></div>)}</div></div>}
            </div>

            <aside className="space-y-4">
              <GoogleGymMap selectedGym={gym} className="h-[22rem]" />
              <div className="space-y-3 rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
                <h2 className="font-bold">Contact gym</h2>
                {gym.phone && <a href={`tel:${gym.phone}`} className="flex items-center gap-2 break-all text-sm text-muted-foreground hover:text-primary"><Phone className="size-4 shrink-0" /> {gym.phone}</a>}
                {gym.email && <a href={`mailto:${gym.email}`} className="flex items-center gap-2 break-all text-sm text-muted-foreground hover:text-primary"><Mail className="size-4 shrink-0" /> {gym.email}</a>}
                <a href={gym.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gym.name} ${gym.address}`)}`} target="_blank" rel="noreferrer" className="btn-accent mt-2 w-full px-4 py-3 text-sm">Open directions</a>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  )
}
