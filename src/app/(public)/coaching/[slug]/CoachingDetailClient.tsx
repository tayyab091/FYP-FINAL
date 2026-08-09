'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/shared/PageLoader'
import { Avatar } from '@/components/shared/Avatar'
import { FadeIn, StaggerChildren } from '@/components/motion'
import {
  Activity,
  Apple,
  Award,
  Clock,
  Dumbbell,
  Flame,
  Globe,
  Heart,
  Languages,
  MessageCircle,
  Star,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'

interface TrainerDetail {
  _id: string
  slug?: string
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
  responseTime?: string
  createdAt?: string
}

interface ReviewItem {
  _id: string
  rating: number
  comment: string
  createdAt: string
  authorName: string
  authorImage?: string
}

interface ReviewsData {
  reviews: ReviewItem[]
  averageRating: number
  reviewCount: number
  currentUserReview: Pick<ReviewItem, '_id' | 'rating' | 'comment' | 'createdAt'> | null
}

type ConnectStatus = 'idle' | 'loading' | 'sent' | 'pending' | 'connected'

const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  'strength training': Dumbbell,
  strength: Dumbbell,
  hiit: Zap,
  yoga: Heart,
  cardio: Activity,
  bodybuilding: Dumbbell,
  crossfit: Flame,
  pilates: Target,
  nutrition: Apple,
  weightlifting: Dumbbell,
  powerlifting: Dumbbell,
  boxing: Flame,
  running: Activity,
}

function specialtyIcon(name: string): LucideIcon {
  return SPECIALTY_ICONS[name.trim().toLowerCase()] || Target
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const className = size === 'md' ? 'text-yellow-400 text-sm' : 'text-yellow-400 text-xs'
  return <p className={className}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</p>
}

function InteractiveStarRating({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => {
        const active = star <= (hover || value)
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`text-xl transition-colors ${active ? 'text-yellow-400' : 'text-muted-foreground/40'} ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:text-yellow-300'}`}
            aria-label={`Rate ${star} stars`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

function formatReviewDate(date: string) {
  return new Date(date).toLocaleDateString('en-PK', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPrice(hourlyRate?: number) {
  if (!hourlyRate) return 'On request'
  return `PKR ${hourlyRate.toLocaleString()}`
}

function ConnectButton({
  status,
  onClick,
  className = '',
}: {
  status: ConnectStatus
  onClick: () => void
  className?: string
}) {
  const disabled = status !== 'idle'
  const label =
    status === 'loading' ? 'Sending...' :
    status === 'sent' ? '✓ Request Sent' :
    status === 'pending' ? '⏳ Pending' :
    status === 'connected' ? 'Connected' :
    'Connect'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl text-sm font-bold transition-all ${
        status === 'sent' ? 'bg-primary/20 text-primary border border-primary/30 cursor-default' :
        status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 cursor-default' :
        status === 'connected' ? 'bg-muted text-muted-foreground border border-border cursor-default' :
        status === 'loading' ? 'bg-primary text-primary-foreground opacity-70 cursor-wait' :
        'bg-primary text-primary-foreground hover:brightness-95 hover:-translate-y-0.5 active:translate-y-0'
      } ${className}`}
    >
      {label}
    </button>
  )
}

export function CoachingDetailClient({ slug }: { slug: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [trainer, setTrainer] = useState<TrainerDetail | null>(null)
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>('idle')
  const [hasActiveRelationship, setHasActiveRelationship] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [availabilitySlots, setAvailabilitySlots] = useState<
    Array<{ dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }>
  >([])

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const loadReviews = useCallback(async (trainerId: string) => {
    const res = await fetch(`/api/trainers/${trainerId}/reviews`, { credentials: 'include' })
    if (!res.ok) return null
    return res.json() as Promise<ReviewsData>
  }, [])

  const loadRelationshipState = useCallback(async (trainerId: string) => {
    if (!user || user.role !== 'user') {
      setHasActiveRelationship(false)
      return
    }
    try {
      const res = await fetch('/api/relationships', { credentials: 'include' })
      if (!res.ok) return
      const relationships = await res.json() as Array<{
        status?: string
        trainerId?: string | { _id?: string }
      }>
      if (!Array.isArray(relationships)) return

      const match = relationships.find(rel => {
        const tid = typeof rel.trainerId === 'string'
          ? rel.trainerId
          : rel.trainerId?._id
        return tid?.toString() === trainerId
      })

      if (!match) {
        setHasActiveRelationship(false)
        return
      }

      if (match.status === 'active') {
        setHasActiveRelationship(true)
        setConnectStatus(prev => (prev === 'idle' || prev === 'pending' || prev === 'sent' ? 'connected' : prev))
      } else if (match.status === 'pending') {
        setHasActiveRelationship(false)
        setConnectStatus(prev => (prev === 'idle' ? 'pending' : prev))
      } else {
        setHasActiveRelationship(false)
      }
    } catch {
      // non-blocking
    }
  }, [user])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/trainers/${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then((trainerData) => {
        setTrainer(trainerData)
      })
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    const trainerId = trainer?._id
    if (!trainerId) return
    Promise.all([
      loadReviews(trainerId),
      fetch(`/api/trainer/availability?trainerId=${encodeURIComponent(trainerId)}`).then((r) =>
        r.ok ? r.json() : { slots: [] },
      ),
    ]).then(([reviews, availability]) => {
      setReviewsData(reviews)
      if (Array.isArray(availability?.slots)) setAvailabilitySlots(availability.slots)
    })
  }, [trainer?._id, loadReviews])

  useEffect(() => {
    const trainerId = trainer?._id
    if (!trainerId || !user) {
      setHasActiveRelationship(false)
      return
    }
    loadRelationshipState(trainerId)
  }, [trainer?._id, user, loadRelationshipState])

  const handleConnect = async () => {
    if (!user) {
      toast.error('Please sign in to connect with a trainer')
      router.push('/login')
      return
    }
    if (connectStatus !== 'idle' || !trainer?._id) return

    setConnectStatus('loading')
    try {
      const res = await fetch(`/api/relationships/request/${encodeURIComponent(trainer._id)}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.status === 409) {
        toast('Request already sent')
        setConnectStatus('pending')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message || 'Failed to send request')
        if (res.status === 403) router.push('/subscription')
        setConnectStatus('idle')
        return
      }
      toast.success('Connection request sent!')
      setConnectStatus('sent')
    } catch {
      toast.error('Failed to send request')
      setConnectStatus('idle')
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Please sign in to leave a review')
      router.push('/login')
      return
    }
    const trimmed = reviewComment.trim()
    if (trimmed.length < 20) {
      toast.error('Comment must be at least 20 characters')
      return
    }

    if (!trainer?._id) return

    setSubmittingReview(true)
    try {
      const res = await fetch(`/api/trainers/${trainer._id}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.message || 'Failed to submit review')
        return
      }

      toast.success('Review submitted!')
      setReviewComment('')
      setReviewRating(5)
      const refreshed = await loadReviews(trainer._id)
      if (refreshed) setReviewsData(refreshed)
      if (typeof data.averageRating === 'number') {
        setTrainer(prev => prev ? { ...prev, rating: data.averageRating } : prev)
      }
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <PageLoader />

  if (!trainer) {
    return (
      <div className="min-h-screen pt-8 pb-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-4">Trainer not found</h1>
          <Link href="/coaching" className="text-primary hover:underline">← Back to coaching</Link>
        </div>
      </div>
    )
  }

  const initials = trainer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const experienceYears = trainer.experience?.match(/\d+/)?.[0]
  const experienceLabel = experienceYears
    ? `${experienceYears}+ years`
    : (trainer.experience?.trim() || '—')
  const averageRating = reviewsData?.averageRating ?? trainer.rating ?? 0
  const reviewCount = reviewsData?.reviewCount ?? 0
  const reviews = reviewsData?.reviews ?? []
  const hasUserReview = Boolean(reviewsData?.currentUserReview)
  const canLeaveReview = Boolean(user && hasActiveRelationship && !hasUserReview)
  const responseTime = trainer.responseTime?.trim() || 'Within 24h'
  const ratingDisplay = reviewCount > 0
    ? averageRating.toFixed(1)
    : (trainer.rating?.toFixed(1) || '—')
  const starFill = Math.round(Number(ratingDisplay) || 0)
  const specialties = Array.isArray(trainer.specialty) ? trainer.specialty : []

  return (
    <div className="min-h-screen pt-8 pb-32 lg:pb-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/coaching" className="text-muted-foreground text-sm hover:text-primary mb-6 inline-block">
          ← All trainers
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <FadeIn>
              <div className="elite-panel rounded-2xl overflow-hidden">
                <div className="relative h-52 bg-gradient-to-br from-primary/15 via-transparent to-sky-400/10 px-6 pt-8">
                  <div className="flex items-end gap-5">
                    <Avatar
                      name={trainer.name}
                      avatarUrl={trainer.profileImage}
                      size="xl"
                      rounded="2xl"
                      className="ring-4 ring-background shadow-xl"
                    />
                    <div className="pb-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="display-title text-3xl text-foreground">{trainer.name}</h1>
                        {trainer.isFullyVerified && (
                          <Badge className="bg-primary/20 text-primary border-primary/30">Verified</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        <Globe className="size-3.5 shrink-0" />
                        {trainer.country}{trainer.gymName ? ` · ${trainer.gymName}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                        <span className="flex items-center gap-1.5 text-yellow-400">
                          <span aria-hidden>{'★'.repeat(Math.min(5, Math.max(0, starFill)))}{'☆'.repeat(Math.max(0, 5 - starFill))}</span>
                          <span className="text-foreground font-semibold">{ratingDisplay}</span>
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="size-3.5" />
                          {trainer.totalClients ?? 0} clients
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-bold text-foreground mb-2">About</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {trainer.bio || 'Passionate coach focused on sustainable progress, smart programming, and building confidence in every session.'}
                    </p>
                    <p className="mt-3 text-sm text-foreground/80 flex items-center gap-2">
                      <Clock className="size-3.5 text-primary" />
                      <span>
                        <span className="text-muted-foreground">Experience: </span>
                        {experienceLabel === '—' ? 'Professional coach' : experienceLabel}
                      </span>
                    </p>
                  </div>

                  {availabilitySlots.some((s) => s.isAvailable) && (
                    <div>
                      <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
                        <Clock className="size-4 text-primary" /> Availability
                      </h2>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {availabilitySlots
                          .filter((s) => s.isAvailable)
                          .map((s) => (
                            <li
                              key={s.dayOfWeek}
                              className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
                            >
                              <span className="text-foreground font-medium">{DAY_NAMES[s.dayOfWeek]}</span>
                              {' · '}
                              {s.startTime} – {s.endTime}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {trainer.certifications && trainer.certifications.length > 0 && (
                    <div>
                      <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
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
                      <h2 className="font-bold text-foreground mb-2 flex items-center gap-2">
                        <Languages className="size-4 text-primary" /> Languages
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {trainer.languages.map(lang => (
                          <Badge key={lang} variant="outline" className="border-border">{lang}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </FadeIn>

            {specialties.length > 0 && (
              <FadeIn delay={0.05}>
                <div className="elite-panel rounded-2xl p-6 sm:p-8">
                  <h2 className="font-bold text-foreground mb-4">Specialties</h2>
                  <StaggerChildren className="grid gap-3 sm:grid-cols-2">
                    {specialties.map(s => {
                      const Icon = specialtyIcon(s)
                      return (
                        <div
                          key={s}
                          className="flex items-center gap-3 rounded-xl border border-border bg-white/[.02] px-4 py-3"
                        >
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                            <Icon className="size-5" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">{s}</p>
                        </div>
                      )
                    })}
                  </StaggerChildren>
                </div>
              </FadeIn>
            )}

            <FadeIn delay={0.08}>
              <div className="elite-panel rounded-2xl p-6 sm:p-8">
                <h2 className="font-bold text-foreground mb-4">Stats</h2>
                <StaggerChildren className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Star className="size-3 text-yellow-400" /> Rating
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">{ratingDisplay}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Users className="size-3" /> Total Clients
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">{trainer.totalClients ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="size-3" /> Years Experience
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">
                      {experienceYears ? `${experienceYears}+` : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <MessageCircle className="size-3" /> Response Time
                    </p>
                    <p className="text-sm font-bold text-foreground mt-1.5 leading-snug">{responseTime}</p>
                  </div>
                </StaggerChildren>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="elite-panel rounded-2xl p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2 className="font-bold text-foreground flex items-center gap-2">
                    <Star className="size-4 text-yellow-400" /> Client reviews
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {reviewCount > 0
                      ? `${averageRating.toFixed(1)} average · ${reviewCount} review${reviewCount === 1 ? '' : 's'}`
                      : 'No reviews yet'}
                  </p>
                </div>

                {canLeaveReview && (
                  <form onSubmit={handleSubmitReview} className="mb-4 rounded-xl border border-border p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">Leave a Review</p>
                    <InteractiveStarRating value={reviewRating} onChange={setReviewRating} disabled={submittingReview} />
                    <textarea
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      minLength={20}
                      disabled={submittingReview}
                      placeholder="What was coaching like? Share at least 20 characters about results, communication, or programming..."
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none disabled:opacity-60"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-xs ${reviewComment.trim().length < 20 ? 'text-muted-foreground' : 'text-primary'}`}>
                        {reviewComment.trim().length}/20 min
                      </p>
                      <Button
                        type="submit"
                        disabled={submittingReview || reviewComment.trim().length < 20}
                        className="bg-primary text-primary-foreground hover:brightness-95 font-semibold"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit review'}
                      </Button>
                    </div>
                  </form>
                )}

                {user && !hasActiveRelationship && !hasUserReview && (
                  <div className="mb-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Connect with this trainer and get accepted to leave a review.
                  </div>
                )}

                {!user && (
                  <div className="mb-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    <Link href="/login" className="text-primary hover:underline">Sign in</Link> to leave a review after connecting with this trainer.
                  </div>
                )}

                {hasUserReview && reviewsData?.currentUserReview && (
                  <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
                    You already reviewed this trainer on {formatReviewDate(reviewsData.currentUserReview.createdAt)}.
                  </div>
                )}

                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No reviews yet — be the first!
                    </div>
                  ) : (
                    reviews.map(review => (
                      <div key={review._id} className="rounded-xl border border-border p-4">
                        <div className="flex items-start gap-3">
                          <Avatar
                            name={review.authorName}
                            avatarUrl={review.authorImage}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-foreground text-sm">{review.authorName}</p>
                              <div className="flex items-center gap-2">
                                <StarRating rating={review.rating} />
                                <span className="text-[10px] text-muted-foreground">{formatReviewDate(review.createdAt)}</span>
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Desktop sticky sidebar */}
          <aside className="hidden lg:block">
            <FadeIn delay={0.1}>
              <div className="sticky top-24 elite-panel rounded-2xl p-6 space-y-4">
                <div>
                  <p className="font-bold text-foreground text-lg leading-tight">{trainer.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-yellow-400 text-sm">{'★'.repeat(Math.min(5, Math.max(0, starFill)))}</span>
                    <span className="text-foreground text-sm font-semibold">{ratingDisplay}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Price per session</p>
                  <p className="text-2xl font-black text-primary mt-0.5">
                    {formatPrice(trainer.hourlyRate)}
                    {trainer.hourlyRate ? <span className="text-sm font-semibold text-muted-foreground">/hr</span> : null}
                  </p>
                </div>
                <ConnectButton
                  status={connectStatus}
                  onClick={handleConnect}
                  className="w-full py-4 text-base"
                />
                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <MessageCircle className="size-3" /> Chat unlocks after connection is accepted
                </p>
              </div>
            </FadeIn>
          </aside>
        </div>
      </div>

      {/* Mobile fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground text-sm">{trainer.name}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-yellow-400">★ {ratingDisplay}</span>
              <span className="text-primary font-bold">
                {formatPrice(trainer.hourlyRate)}
                {trainer.hourlyRate ? '/hr' : ''}
              </span>
            </div>
          </div>
          <ConnectButton
            status={connectStatus}
            onClick={handleConnect}
            className="shrink-0 px-6 py-3"
          />
        </div>
      </div>
    </div>
  )
}
