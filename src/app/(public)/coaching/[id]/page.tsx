'use client'

import { useCallback, useEffect, useState } from 'react'
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

interface ReviewItem {
  _id: string
  rating: number
  comment: string
  createdAt: string
  authorName: string
}

interface ReviewsData {
  reviews: ReviewItem[]
  averageRating: number
  reviewCount: number
  currentUserReview: Pick<ReviewItem, '_id' | 'rating' | 'comment' | 'createdAt'> | null
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

export default function TrainerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const [trainer, setTrainer] = useState<TrainerDetail | null>(null)
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  const loadReviews = useCallback(async (trainerId: string) => {
    const res = await fetch(`/api/trainers/${trainerId}/reviews`, { credentials: 'include' })
    if (!res.ok) return null
    return res.json() as Promise<ReviewsData>
  }, [])

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/trainers/${id}`).then(r => r.ok ? r.json() : null),
      loadReviews(id),
    ])
      .then(([trainerData, reviews]) => {
        setTrainer(trainerData)
        setReviewsData(reviews)
      })
      .finally(() => setLoading(false))
  }, [id, loadReviews])

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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Please sign in to leave a review')
      router.push('/login')
      return
    }
    if (!reviewComment.trim()) {
      toast.error('Please write a comment')
      return
    }

    setSubmittingReview(true)
    try {
      const res = await fetch(`/api/trainers/${id}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.message || 'Failed to submit review')
        return
      }

      toast.success('Review submitted!')
      setReviewComment('')
      setReviewRating(5)
      const refreshed = await loadReviews(id)
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
          <h1 className="text-xl font-bold text-white mb-4">Trainer not found</h1>
          <Link href="/coaching" className="text-primary hover:underline">← Back to coaching</Link>
        </div>
      </div>
    )
  }

  const initials = trainer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const experienceYears = trainer.experience?.match(/\d+/)?.[0]
  const acceptingClients = trainer.isActive !== false
  const averageRating = reviewsData?.averageRating ?? trainer.rating ?? 0
  const reviewCount = reviewsData?.reviewCount ?? 0
  const reviews = reviewsData?.reviews ?? []
  const hasUserReview = Boolean(reviewsData?.currentUserReview)

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 sm:px-6">
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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 className="font-bold text-white flex items-center gap-2">
                      <Star className="size-4 text-yellow-400" /> Client reviews
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {reviewCount > 0
                        ? `${averageRating.toFixed(1)} average · ${reviewCount} review${reviewCount === 1 ? '' : 's'}`
                        : 'No reviews yet'}
                    </p>
                  </div>

                  {user && !hasUserReview && (
                    <form onSubmit={handleSubmitReview} className="mb-4 rounded-xl border border-border p-4 space-y-3">
                      <p className="text-sm font-medium text-white">Share your experience</p>
                      <InteractiveStarRating value={reviewRating} onChange={setReviewRating} disabled={submittingReview} />
                      <textarea
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        disabled={submittingReview}
                        placeholder="What was coaching like? Mention results, communication, or programming quality..."
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none disabled:opacity-60"
                      />
                      <Button
                        type="submit"
                        disabled={submittingReview || !reviewComment.trim()}
                        className="bg-primary text-black hover:brightness-95 font-semibold"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit review'}
                      </Button>
                    </form>
                  )}

                  {!user && (
                    <div className="mb-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      <Link href="/login" className="text-primary hover:underline">Sign in</Link> to leave a review.
                    </div>
                  )}

                  {hasUserReview && reviewsData?.currentUserReview && (
                    <p className="mb-3 text-xs text-primary">You reviewed this trainer on {formatReviewDate(reviewsData.currentUserReview.createdAt)}.</p>
                  )}

                  <div className="space-y-3">
                    {reviews.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        Be the first to review {trainer.name.split(' ')[0]}.
                      </div>
                    ) : (
                      reviews.map(review => (
                        <div key={review._id} className="rounded-xl border border-border p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-white text-sm">{review.authorName}</p>
                            <div className="flex items-center gap-2">
                              <StarRating rating={review.rating} />
                              <span className="text-[10px] text-muted-foreground">{formatReviewDate(review.createdAt)}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                        </div>
                      ))
                    )}
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
                    <span className="text-2xl font-black text-white">
                      {reviewCount > 0 ? averageRating.toFixed(1) : (trainer.rating?.toFixed(1) || '—')}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {reviewCount > 0 ? `${reviewCount} review${reviewCount === 1 ? '' : 's'}` : 'Average rating'}
                  </span>
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
