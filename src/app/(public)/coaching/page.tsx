'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { FadeIn } from '@/components/motion'
import { EmptyState } from '@/components/shared/EmptyState'
import { easeTransition } from '@/lib/motion'
import { Avatar } from '@/components/shared/Avatar'
import { trainerPublicPath } from '@/lib/trainer-slug'

interface Trainer {
  _id: string
  slug?: string
  name?: string
  fullName?: string
  specialty: string | string[]
  country: string
  rating?: number
  bio?: string
  profileImage?: string
  gymName?: string
  isFallback?: boolean
}

interface TrainersMeta {
  source: 'database' | 'fallback'
  connectable: boolean
}

function parseTrainersResponse(data: unknown): { trainers: Trainer[]; meta?: TrainersMeta } {
  if (Array.isArray(data)) return { trainers: data }
  if (data && typeof data === 'object' && 'trainers' in data) {
    const payload = data as { trainers?: Trainer[]; meta?: TrainersMeta }
    return { trainers: Array.isArray(payload.trainers) ? payload.trainers : [], meta: payload.meta }
  }
  return { trainers: [] }
}

function TrainerCard({ trainer, connectable, onConnect }: { trainer: Trainer; connectable: boolean; onConnect: (id: string) => Promise<void> }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'pending'>('idle')
  const name = trainer.name || trainer.fullName || 'Trainer'
  const specialties = Array.isArray(trainer.specialty) ? trainer.specialty : [trainer.specialty].filter(Boolean)

  const handleConnect = async () => {
    setStatus('loading')
    try {
      await onConnect(trainer._id)
      setStatus('sent')
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'pending') setStatus('pending')
      else setStatus('idle')
    }
  }

  const isPreview = trainer.isFallback || !connectable

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={easeTransition}
      className="elite-panel interactive-lift card-athletic flex flex-col overflow-hidden rounded-2xl"
    >
      <Link href={isPreview ? '/coaching' : trainerPublicPath(trainer)} className="relative h-40 bg-gradient-to-br from-primary/10 to-sky-400/5 flex items-center justify-center">
        <Avatar
          name={name}
          avatarUrl={trainer.profileImage}
          size="lg"
          className="ring-4 ring-background shadow-xl"
        />
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/80 px-2 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] text-primary font-medium">{isPreview ? 'Preview' : 'Verified'}</span>
        </div>
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <Link href={isPreview ? '/coaching' : trainerPublicPath(trainer)}>
              <h3 className="font-bold text-foreground text-base hover:text-primary transition-colors">{name}</h3>
            </Link>
            <p className="text-muted-foreground text-xs mt-0.5">{trainer.country}{trainer.gymName ? ` · ${trainer.gymName}` : ''}</p>
          </div>
          <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-foreground text-xs font-bold">{trainer.rating?.toFixed(1) || '5.0'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {specialties.slice(0, 3).map((s: string) => (
            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              {s}
            </span>
          ))}
        </div>

        {trainer.bio && (
          <p className="text-muted-foreground text-xs line-clamp-3 leading-relaxed mb-4 flex-1">{trainer.bio}</p>
        )}

        <button
          onClick={handleConnect}
          disabled={status !== 'idle' || isPreview}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
            status === 'sent' ? 'bg-primary/20 text-primary border border-primary/30 cursor-default' :
            status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 cursor-default' :
            status === 'loading' ? 'bg-primary text-primary-foreground opacity-70 cursor-wait' :
            isPreview ? 'bg-muted text-muted-foreground cursor-not-allowed' :
            'bg-primary text-primary-foreground hover:brightness-95 hover:-translate-y-0.5 active:translate-y-0'
          }`}>
          {status === 'loading' ? 'Sending...' :
           status === 'sent' ? '✓ Request Sent' :
           status === 'pending' ? '⏳ Pending' :
           isPreview ? 'Seed database to connect' :
           'Connect'}
        </button>
        {!isPreview && (
          <Link href={trainerPublicPath(trainer)} className="mt-2 text-center text-xs text-primary hover:underline">
            View profile →
          </Link>
        )}
      </div>
    </motion.div>
  )
}

function TrainerSkeleton() {
  return (
    <div className="elite-panel overflow-hidden rounded-2xl">
      <div className="h-40 skeleton" />
      <div className="p-5 space-y-3">
        <div className="h-4 skeleton w-3/4" />
        <div className="h-3 skeleton w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 skeleton rounded-full w-20" />
          <div className="h-5 skeleton rounded-full w-16" />
        </div>
        <div className="h-3 skeleton" />
        <div className="h-3 skeleton w-2/3" />
        <div className="h-10 skeleton rounded-xl" />
      </div>
    </div>
  )
}

const SPECIALTIES = ['All', 'Strength Training', 'HIIT', 'Yoga', 'Cardio', 'Bodybuilding', 'CrossFit', 'Pilates', 'Nutrition']
const COUNTRIES = ['All', 'Pakistan', 'UAE', 'UK', 'USA']

export default function CoachingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [meta, setMeta] = useState<TrainersMeta | undefined>()
  const [loading, setLoading] = useState(true)
  const [specialty, setSpecialty] = useState('All')
  const [country, setCountry] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    setLoading(true)

    const params = new URLSearchParams()
    if (specialty !== 'All') params.set('specialty', specialty)
    if (country !== 'All') params.set('country', country)
    if (search.trim()) params.set('search', search.trim())

    fetch(`/api/trainers${params.size ? '?' + params : ''}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : { trainers: [] })
      .then(data => {
        const parsed = parseTrainersResponse(data)
        setTrainers(parsed.trainers)
        setMeta(parsed.meta)
      })
      .catch(() => { setTrainers([]); setMeta(undefined) })
      .finally(() => { clearTimeout(timeout); setLoading(false) })

    return () => { controller.abort(); clearTimeout(timeout) }
  }, [specialty, country, search])

  const handleConnect = async (trainerId: string) => {
    if (!user) {
      toast.error('Please sign in to connect with a trainer')
      router.push('/login')
      throw new Error('not logged in')
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const res = await fetch(`/api/relationships/request/${trainerId}`, {
        method: 'POST',
        credentials: 'include',
        signal: controller.signal,
      })
      if (res.status === 409) { toast('Request already sent'); throw new Error('pending') }
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Failed to send request' }))
        const message = typeof data.message === 'string' ? data.message : 'Failed to send request'
        toast.error(message)
        if (res.status === 403 && message.toLowerCase().includes('upgrade')) {
          router.push('/subscription')
          throw new Error('upgrade')
        }
        throw new Error('error')
      }
      toast.success('Connection request sent! 🎉')
    } finally {
      clearTimeout(timeout)
    }
  }

  return (
    <div className="min-h-screen pt-8 pb-24">
      <FadeIn>
        <div className="page-hero max-w-6xl mx-4 px-6 py-10 sm:mx-6 sm:px-10 md:mx-auto md:py-14 gym-floor min-h-[14rem] md:min-h-[16rem]">
          <p className="eyebrow mb-3">Trainer Marketplace</p>
          <h1 className="display-title text-balance text-4xl md:text-6xl text-foreground mb-4">Find Your Perfect Trainer</h1>
          <p className="max-w-xl text-muted-foreground">Discover verified coaches matched to your goals, training style, and location.</p>
          <p className="workout-label mt-3 text-primary/70">Your coach · Your rules · Your gains</p>
        </div>
      </FadeIn>

      <div className="elite-panel max-w-6xl mx-4 mt-6 space-y-4 p-4 sm:mx-6 sm:p-5 md:mx-auto">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, specialty, or keyword..."
          className="w-full rounded-xl border border-border bg-muted/60 px-5 py-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-3 focus:ring-primary/10"
        />

        <div className="flex gap-2 flex-wrap">
          {SPECIALTIES.map(s => (
            <button key={s} onClick={() => setSpecialty(s)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                specialty === s
                  ? 'bg-primary text-primary-foreground border-primary filter-pill-active'
                  : 'bg-transparent text-muted-foreground border-border hover:border-primary/25'
              }`}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Country:</span>
          <div className="flex gap-2 flex-wrap">
            {COUNTRIES.map(c => (
              <button key={c} onClick={() => setCountry(c)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  country === c
                    ? 'border-sky-400 text-sky-400 bg-sky-400/10'
                    : 'border-border text-muted-foreground hover:border-border'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {meta?.source === 'fallback' && !loading && (
        <div className="max-w-6xl mx-auto px-6 mt-4">
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            <strong>Preview mode:</strong> Showing sample trainers because the database is empty.
            Run the seed script (see README) to connect with real coaches.
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 mb-6">
        {!loading && (
          <p className="text-xs text-muted-foreground">
            {trainers.length} trainer{trainers.length !== 1 ? 's' : ''} found
            {specialty !== 'All' && ` in ${specialty}`}
            {country !== 'All' && ` from ${country}`}
          </p>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <TrainerSkeleton key={i} />)}
          </div>
        ) : trainers.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`${specialty}-${country}-${search}`}
              layout
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {trainers.map(t => (
                <TrainerCard
                  key={t._id}
                  trainer={t}
                  connectable={meta?.connectable !== false && !t.isFallback}
                  onConnect={handleConnect}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <EmptyState
            icon={<Search className="size-7" />}
            tagline="No coaches match"
            title="No trainers found"
            description="Try adjusting your filters or search term"
            action={
              <button onClick={() => { setSpecialty('All'); setCountry('All'); setSearch('') }}
                className="btn-accent px-6 text-sm">
                Clear Filters
              </button>
            }
          />
        )}
      </div>
    </div>
  )
}
