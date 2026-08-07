import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'sets' | 'reps' | 'pr' | 'rest' | 'default'

interface FitnessBadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  sets: 'border-sky-600/30 bg-sky-500/10 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300',
  reps: 'border-primary/30 bg-primary/10 text-primary',
  pr: 'border-yellow-600/30 bg-yellow-500/10 text-yellow-800 dark:border-yellow-400/30 dark:bg-yellow-400/10 dark:text-yellow-300',
  rest: 'border-border bg-muted/60 text-muted-foreground',
  default: 'border-primary/25 bg-primary/[.08] text-primary',
}

export function FitnessBadge({ children, variant = 'default', className }: FitnessBadgeProps) {
  return (
    <span
      className={cn(
        'workout-badge inline-flex items-center gap-1 rounded-md border px-2 py-0.5',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
