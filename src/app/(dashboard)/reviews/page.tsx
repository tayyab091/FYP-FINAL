'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { SignInGate } from '@/components/shared/AccessGate'
import { ReviewForm } from '@/components/shared/ReviewForm'

interface Review { id: string; type: string; name: string; rating: number; comment: string; anonymous: boolean }
interface Target { id: string; type: string; name: string; endpoint: string; reviewed: boolean }

export default function ReviewsPage() {
  const { user, isLoading } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch('/api/user/reviews', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load your reviews')
        return response.json()
      })
      .then(data => {
        if (controller.signal.aborted) return
        setReviews(data.reviews || [])
        setTargets(data.targets || [])
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [user, attempt])

  if (!isLoading && !user) return <SignInGate redirectLabel="Sign in to view your reviews" />
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 pb-28">
      <div>
        <p className="section-eyebrow">Your connections</p>
        <h1 className="display-title text-3xl text-foreground">My ratings and reviews</h1>
        <p className="mt-2 text-muted-foreground">Review your connected trainers and their gyms here. Choose anonymous posting to hide your name and photo.</p>
      </div>
      {loading || isLoading ? <p role="status">Loading your reviews…</p> : error ? (
        <div role="alert" className="tile text-destructive">{error}
          <button type="button" onClick={() => setAttempt(value => value + 1)} className="ml-3 underline">Try again</button>
        </div>
      ) : (
        <>
          <section aria-label="Connections you can review" className="space-y-4">
            {targets.filter(target => !target.reviewed).map(target => (
              <article key={target.type + target.id} className="tile space-y-4">
                <div><p className="text-xs text-muted-foreground">{target.type}</p><h2 className="text-xl font-bold">{target.name}</h2></div>
                <ReviewForm endpoint={target.endpoint} onSaved={() => setAttempt(value => value + 1)} />
              </article>
            ))}
            {!targets.length && <div className="tile">Your active trainer connections and their verified gyms will appear here when you connect with a trainer.</div>}
          </section>
          <section aria-label="Your saved reviews" className="space-y-4">
            <h2 className="text-xl font-bold">Your reviews</h2>
            {reviews.length ? reviews.map(review => (
              <article className="tile space-y-2" key={review.type + review.id}>
                <p className="text-xs text-muted-foreground">{review.type}{review.anonymous ? ' · Posted anonymously' : ''}</p>
                <h3 className="text-lg font-bold">{review.name}</h3>
                <p className="font-semibold text-primary">{review.rating}/5 stars</p>
                <p className="break-words text-muted-foreground">{review.comment}</p>
              </article>
            )) : <p className="text-muted-foreground">You haven’t left any reviews yet.</p>}
          </section>
        </>
      )}
    </div>
  )
}
