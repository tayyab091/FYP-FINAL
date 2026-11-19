'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

const labels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent']

export function StarRatingInput({ value, onChange, disabled = false }: {
  value: number; onChange: (value: number) => void; disabled?: boolean
}) {
  const [hovered, setHovered] = useState(0)
  const selected = hovered || value
  return (
    <div className="space-y-2">
      <div role="group" aria-label="Your star rating" className="flex flex-wrap gap-2" onMouseLeave={() => setHovered(0)}>
        {labels.map((label, index) => {
          const rating = index + 1
          return <button key={label} type="button" disabled={disabled}
            aria-label={'Rate ' + rating + ' stars'} title={label} aria-pressed={value === rating}
            onClick={() => onChange(rating)} onMouseEnter={() => setHovered(rating)}
            onFocus={() => setHovered(rating)} onBlur={() => setHovered(0)}
            className="group flex size-12 items-center justify-center rounded-2xl bg-amber-400/10 transition hover:scale-110 hover:bg-amber-400/20 focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-50">
            <Star aria-hidden="true" className={rating <= selected ? 'size-7 fill-amber-400 text-amber-500 drop-shadow-sm' : 'size-7 text-muted-foreground/40'} strokeWidth={1.5} />
          </button>
        })}
      </div>
      <p aria-live="polite" className="text-sm font-semibold text-amber-700 dark:text-amber-300">{selected}/5 · {labels[selected - 1]}</p>
    </div>
  )
}
