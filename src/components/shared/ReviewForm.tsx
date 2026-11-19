'use client'

import { toast } from 'sonner'
import { StarRatingInput } from './StarRatingInput'
import { useId, useState, type FormEvent } from 'react'

export function ReviewForm({ endpoint, onSaved }: { endpoint: string; onSaved: () => void }) {
  const id = useId()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (comment.trim().length < 3) {
      setError('Please write at least 3 characters about your experience.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim(), anonymous }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to save review')
      setComment('')
      toast.success('Your review has been saved')
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save review')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={saving} className="space-y-4">
        <legend className="mb-2 text-sm font-semibold">Your rating</legend>
        <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
        <label htmlFor={id} className="block text-sm font-semibold">Your experience</label>
        <textarea id={id} required minLength={3} maxLength={1000} rows={3} value={comment}
          onChange={event => setComment(event.target.value)} placeholder="Share your experience (at least 3 characters)"
          className="w-full rounded-xl border border-border bg-background p-3 text-foreground" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)} />
          Post anonymously (hide my name and photo)
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={saving} className="btn-accent disabled:opacity-50">
          {saving ? 'Saving…' : 'Submit review'}
        </button>
      </fieldset>
    </form>
  )
}
