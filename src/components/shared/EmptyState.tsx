import type { ReactNode } from 'react'
import { Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  tagline?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tagline = 'No gains logged yet',
}: EmptyStateProps) {
  return (
    <div className={cn('elite-panel card-athletic flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.08] text-primary animate-energy-pulse">
        {icon ?? <Dumbbell className="size-7" strokeWidth={2.2} />}
      </div>
      <p className="workout-label mb-2 text-primary/70">{tagline}</p>
      <h3 className="font-heading text-lg font-bold text-white">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
