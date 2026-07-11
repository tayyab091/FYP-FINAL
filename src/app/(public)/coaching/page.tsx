'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Trainer {
  _id: string
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

function TrainerCard({ trainer, onConnect }: { trainer: Trainer; onConnect: (id: string) => Promise<void> }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'pending'>('idle')
  const name = trainer.name || trainer.fullName || 'Trainer'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const specialties = Array.isArray(trainer.specialty) ? trainer.specialty : [trainer.specialty].filter(Boolean)
  const image = trainer.profileImage

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

  return (
    <div className="glass rounded-2xl overflow-hidden hover:border-[#00ff87]/30 transition-all duration-200 group flex flex-col">
      <div className="relative h-40 bg-gradient-to-br from-[#00ff87]/10 to-[#00bfff]/5 flex items-center justify-center">
        {image ? (
          <Image src={image} alt={name} width={80} height={80}
            className="h-20 w-20 rounded-full object-cover ring-4 ring-[#0a0a0a] shadow-xl" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00ff87] to-[#00bfff] flex items-center justify-center text-black font-black text-2xl ring-4 ring-[#0a0a0a]">
            {initials}
          </div>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#0a0a0a]/80 px-2 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
          <span className="text-[10px] text-[#00ff87] font-medium">{trainer.isFallback ? 'Preview' : 'Verified'}</span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-white text-base">{name}</h3>
            <p className="text-[#a0a0a0] text-xs mt-0.5">{trainer.country}{trainer.gymName ? ` · ${trainer.gymName}` : ''}</p>
          </div>
          <div className="flex items-center gap-1 bg-[#1a1a1a] px-2 py-1 rounded-lg">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-white text-xs font-bold">{trainer.rating?.toFixed(1) || '5.0'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {specialties.slice(0, 3).map((s: string) => (
            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20 font-medium">
              {s}
            </span>
          ))}
        </div>

        {trainer.bio && (
          <p className="text-[#a0a0a0] text-xs line-clamp-3 leading-relaxed mb-4 flex-1">{trainer.bio}</p>
        )}

        <button
          onClick={handleConnect}
          disabled={status !== 'idle' || trainer.isFallback}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
            status === 'sent' ? 'bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/30 cursor-default' :
            status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 cursor-default' :
            status === 'loading' ? 'bg-[#00ff87] text-black opacity-70 cursor-wait' :
            trainer.isFallback ? 'bg-[#1a1a1a] text-[#777] cursor-not-allowed' :
            'bg-[#00ff87] text-black hover:bg-[#00cc6a] hover:-translate-y-0.5 active:translate-y-0'
          }`}>
          {status === 'loading' ? 'Sending...' :
           status === 'sent' ? '✓ Request Sent' :
           status === 'pending' ? '⏳ Pending' :
           trainer.isFallback ? 'Seed database to connect' :
           'Connect'}
        </button>
      </div>
    </div>
  )
}

function TrainerSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden">
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
      .then(r => r.ok ? r.json() : [])
      .then(data => setTrainers(Array.isArray(data) ? data : data?.trainers || data?.data || []))
      .catch(() => setTrainers([]))
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
      if (res.status === 403) { toast.error('Upgrade your plan to connect'); router.push('/subscription'); throw new Error('upgrade') }
      if (!res.ok) { toast.error('Failed to send request'); throw new Error('error') }
      toast.success('Connection request sent! 🎉')
    } finally {
      clearTimeout(timeout)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <p className="text-[#00ff87] text-sm font-semibold uppercase tracking-widest mb-2">Trainer Marketplace</p>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3">Find Your Perfect Trainer</h1>
        <p className="text-[#a0a0a0]">Browse verified coaches and connect instantly</p>
      </div>

      <div className="max-w-6xl mx-auto px-6 mb-8 space-y-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, specialty, or keyword..."
          className="w-full glass rounded-2xl px-5 py-3.5 text-white text-sm placeholder-[#555] outline-none focus:border-[#00ff87] transition-colors"
        />

        <div className="flex gap-2 flex-wrap">
          {SPECIALTIES.map(s => (
            <button key={s} onClick={() => setSpecialty(s)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                specialty === s
                  ? 'bg-[#00ff87] text-black border-[#00ff87]'
                  : 'bg-transparent text-[#a0a0a0] border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#555] font-medium">Country:</span>
          <div className="flex gap-2 flex-wrap">
            {COUNTRIES.map(c => (
              <button key={c} onClick={() => setCountry(c)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  country === c
                    ? 'border-[#00bfff] text-[#00bfff] bg-[#00bfff]/10'
                    : 'border-[#1a1a1a] text-[#555] hover:border-[#2a2a2a]'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mb-6">
        {!loading && (
          <p className="text-xs text-[#555]">
            {trainers.length} trainer{trainers.length !== 1 ? 's' : ''} found
            {specialty !== 'All' && ` in ${specialty}`}
            {country !== 'All' && ` from ${country}`}
          </p>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <TrainerSkeleton key={i} />)}
          </div>
        ) : trainers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainers.map(t => <TrainerCard key={t._id} trainer={t} onConnect={handleConnect} />)}
          </div>
        ) : (
          <div className="text-center py-20 glass rounded-2xl">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-white mb-2">No trainers found</h3>
            <p className="text-[#a0a0a0] text-sm mb-6">Try adjusting your filters or search term</p>
            <button onClick={() => { setSpecialty('All'); setCountry('All'); setSearch('') }}
              className="bg-[#00ff87] text-black px-6 py-2.5 rounded-full text-sm font-bold">
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
