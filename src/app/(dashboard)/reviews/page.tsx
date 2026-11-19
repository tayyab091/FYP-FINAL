'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { SignInGate } from '@/components/shared/AccessGate'

interface Review { id: string; type: string; name: string; href: string; rating: number; comment: string }
export default function ReviewsPage() {
  const { user, isLoading } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch('/api/user/reviews', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Unable to load your reviews')
      return response.json()
    }).then(data => { if (!controller.signal.aborted) setReviews(data.reviews || []) }).catch(cause => { if (!controller.signal.aborted) setError(cause.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [user?.id, attempt, user])
  if (!isLoading && !user) return <SignInGate redirectLabel="Sign in to view your reviews" />
  return <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8"><h1 className="display-title text-3xl text-foreground">My ratings and reviews</h1><p className="text-muted-foreground">Share your gym experience or review a trainer you are connected with.</p><div className="flex flex-wrap gap-3"><Link href="/gyms" className="btn-accent">Rate a gym</Link><Link href="/coaching" className="rounded-xl border border-border px-5 py-3 font-semibold text-primary">Rate a trainer</Link></div>{loading || isLoading ? <p role="status">Loading your reviews…</p> : error ? <div role="alert" className="tile text-destructive">{error}<button type="button" onClick={() => setAttempt(value => value + 1)} className="ml-3 underline">Try again</button></div> : reviews.length ? reviews.map(review => <article className="tile space-y-2" key={review.id}><p className="text-xs text-muted-foreground">{review.type}</p><Link href={review.href} className="text-lg font-bold text-primary">{review.name}</Link><p className="font-semibold">{review.rating}/5 stars</p><p className="break-words text-muted-foreground">{review.comment}</p></article>) : <div className="tile">You haven&apos;t left any reviews yet. Choose a gym or trainer to get started.</div>}</div>
}
