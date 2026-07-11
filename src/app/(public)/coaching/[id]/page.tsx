'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/shared/PageLoader'
import { FadeIn, StaggerChildren } from '@/components/motion'
import {
  Award,
  Calendar,
  Clock,
  DollarSign,
  Globe,
  Languages,
  MessageCircle,
  Star,
  Users,
} from 'lucide-react'

interface TrainerDetail {
  _id: string
  name: string
  specialty: string[]
  country: string
  rating: number
  bio: string
  profileImage?: string
  gymName?: string
  isFullyVerified: boolean
  isActive?: boolean
  experience?: string
  certifications?: string[]
  hourlyRate?: number
  totalClients?: number
  languages?: string[]
  createdAt?: string
}

const REVIEW_PLACEHOLDERS = [
  { author: 'Ahmed K.', text: 'Incredible attention to form. My squat depth improved in two weeks.', rating: 5 },
  { author: 'Sana M.', text: 'Responsive, motivating, and builds plans that actually fit my schedule.', rating: 5 },
  { author: 'Bilal R.', text: 'Professional coaching with real accountability. Highly recommend.', rating: 4 },
]

export default function TrainerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [trainer, setTrainer] = useState<TrainerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/trainers/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setTrainer(data))
      .finally(() => setLoading(false))
  }, [id])

  const handleConnect = async () => {
    if (!user) {
      toast.error('Please sign in to connect')
      router.push('/login')
      return
    }
    setConnecting(true)
    try {
      const res = await fetch(`/api/relationships/request/${id}`, { method: 'POST', credentials: 'include' })
      if (res.status === 409) { toast('Request already sent'); return }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message || 'Failed to send request')
        if (res.status === 403) router.push('/subscription')
        return
      }
      toast.success('Connection request sent!')
    } finally {
      setConnecting(false)
    }
  }

  if (loading) return <PageLoader />

  if (!trainer) {
    return (
      <div className="min-h-screen pt-28 pb-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-4">Trainer not found</h1>
          <Link href="/coaching" className="text-primary hover:underline">← Back to coaching</Link>
        </div>
      </div>
    )
  }

  const initials = trainer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const experienceYears = trainer.experience?.match(/\d+/)?.[0]
  const acceptingClients = trainer.isActive !== false

  return (
    <div className="min-h-screen pt-28 pb-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/coaching" className="text-muted-foreground text-sm hover:text-primary mb-6 inline-block">
          ← All trainers
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <FadeIn>
            <div className="elite-panel rounded-2xl overflow-hidden">
              <div className="relative h-52 bg-gradient-to-br from-primary/15 via-transparent to-sky-400/10 px-6 pt-8">
                <div className="flex items-end gap-5">
                  {trainer.profileImage ? (
                    <Image src={trainer.profileImage} alt={trainer.name} width={112} height={112}
                      className="h-28 w-28 rounded-2xl object-cover ring-4 ring-background shadow-xl" />
                  ) : (
                    <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-primary to-sky-400 flex items-center justify-center text-black font-black text-3xl ring-4 ring-background">
                      {initials}
                    </div>
                  )}
                  <div className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="display-title text-3xl text-white">{trainer.name}</h1>
                      {trainer.isFullyVerified && (
                        <Badge className="bg-primary/20 text-primary border-primary/30">Verified</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                      <Globe className="size-3.5" />
                      {trainer.country}{trainer.gymName ? ` · ${trainer.gymName}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap gap-2">
                  {trainer.specialty?.map(s => (
                    <Badge key={s} className="bg-primary/10 text-primary border-primary/20">{s}</Badge>
                  ))}
                </div>

                <div>
                  <h2 className="font-bold text-white mb-2">About</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {trainer.bio || 'Passionate coach focused on sustainable progress, smart programming, and building confidence in every session.'}
                  </p>
                </div>

                {trainer.certifications && trainer.certifications.length > 0 && (
                  <div>
                    <h2 className="font-bold text-white mb-3 flex items-center gap-2">
                      <Award className="size-4 text-primary" /> Certifications
                    </h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {trainer.certifications.map(c => (
                        <li key={c} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">✓ {c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {trainer.languages && trainer.languages.length > 0 && (
                  <div>
                    <h2 className="font-bold text-white mb-2 flex items-center gap-2">
                      <Languages className="size-4 text-primary" /> Languages
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {trainer.languages.map(lang => (
                        <Badge key={lang} variant="outline" className="border-border">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Star className="size-4 text-yellow-400" /> Client reviews
                  </h2>
                  <div className="space-y-3">
                    {REVIEW_PLACEHOLDERS.map((review) => (
                      <div key={review.author} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-white text-sm">{review.author}</p>
                          <p className="text-yellow-400 text-xs">{'★'.repeat(review.rating)}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">Sample reviews — live review system coming soon.</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <div className="space-y-4">
            <FadeIn delay={0.1}>
              <div className="elite-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="size-5 text-yellow-400" />
                    <span className="text-2xl font-black text-white">{trainer.rating?.toFixed(1) || '5.0'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Average rating</span>
                </div>

                <StaggerChildren className="dashboard-grid">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="size-3" /> Clients coached</p>
                    <p className="text-xl font-bold text-white mt-1">{trainer.totalClients ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> Experience</p>
                    <p className="text-sm font-bold text-white mt-1">{trainer.experience || (experienceYears ? `${experienceYears}+ years` : 'Professional')}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="size-3" /> Session rate</p>
                    <p className="text-xl font-bold text-primary mt-1">
                      {trainer.hourlyRate ? `PKR ${trainer.hourlyRate.toLocaleString()}/hr` : 'On request'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="size-3" /> Availability</p>
                    <p className={`text-sm font-bold mt-1 ${acceptingClients ? 'text-primary' : 'text-amber-400'}`}>
                      {acceptingClients ? 'Accepting new clients' : 'Waitlist only'}
                    </p>
                  </div>
                </StaggerChildren>

                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full bg-primary text-black hover:brightness-95 py-6 text-base font-bold"
                >
                  {connecting ? 'Sending...' : 'Connect with Trainer'}
                </Button>
                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <MessageCircle className="size-3" /> Chat unlocks after connection is accepted
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </div>
  )
}
