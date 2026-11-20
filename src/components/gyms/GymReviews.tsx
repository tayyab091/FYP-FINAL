'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { StarRatingInput } from '@/components/shared/StarRatingInput'
import { useAuth } from '@/hooks/useAuth'

interface Review { _id: string; rating: number; comment: string; authorName: string }
interface Reviews { reviews: Review[]; averageRating: number; reviewCount: number; canReview?: boolean; currentUserReview: { rating: number; comment: string } | null }

export function GymReviews({ slug, onRatingChange }: { slug: string; onRatingChange: (rating: number, count: number) => void }) {
  const { user } = useAuth()
  const [data, setData] = useState<Reviews | null>(null)
  const [anonymous, setAnonymous] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    fetch(`/api/gyms/${encodeURIComponent(slug)}/reviews`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Reviews are temporarily unavailable.')
      return response.json()
    }).then(setData).catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [slug, user?.id, attempt])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/gyms/${encodeURIComponent(slug)}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, comment, anonymous }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to save review')
      setData(previous => ({ reviews: [result.review, ...(previous?.reviews || [])], averageRating: result.averageRating, reviewCount: result.reviewCount, currentUserReview: result.review, canReview: previous?.canReview }))
      onRatingChange(result.averageRating, result.reviewCount)
      setComment('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save review') }
    finally { setSaving(false) }
  }
  return <section id="reviews" aria-label="Gym ratings and reviews" className="space-y-4">
    <h2 className="text-xl font-bold text-foreground">Gym ratings and reviews</h2>
    {data && <p className="text-sm text-muted-foreground">{data.reviewCount ? `${data.averageRating.toFixed(1)} / 5 · ${data.reviewCount} reviews` : 'No reviews yet. Share your experience.'}</p>}
    {error && <div role="alert" className="text-sm text-destructive">{error} <button type="button" onClick={() => setAttempt(value => value + 1)} className="underline">Retry reviews</button></div>}
    {!data && !error && <p role="status" className="text-sm text-muted-foreground">Loading reviews…</p>}
    {!user ? <Link href="/login" className="text-primary">Sign in to rate this gym</Link> : data?.currentUserReview ? <p role="status" className="text-primary">Your {data.currentUserReview.rating}-star review has been saved.</p> : data?.canReview && <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
      <label className="block text-sm font-semibold" htmlFor="gym-review">Your experience</label><textarea id="gym-review" value={comment} onChange={event => setComment(event.target.value)} minLength={3} maxLength={1000} required rows={3} placeholder="Share your experience with the facilities, atmosphere, and service (at least 3 characters)" className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)} />Post anonymously (hide my name)</label>
      <button type="submit" disabled={saving} className="btn-accent disabled:opacity-50">{saving ? 'Saving review…' : 'Submit gym review'}</button>
    </form>}
    {data?.reviews.map(review => <article key={review._id} className="rounded-xl border border-border bg-card p-4"><p className="font-semibold text-foreground">{review.authorName} <span className="text-primary">{review.rating}/5</span></p><p className="mt-2 break-words text-sm text-muted-foreground">{review.comment}</p></article>)}
  </section>
}
