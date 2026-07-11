'use client'

import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CountUp } from '@/components/motion/CountUp'

type StatVariant = 'primary' | 'sky' | 'amber' | 'rose'

const VARIANT_STYLES: Record<StatVariant, { gradient: string; iconBg: string; value: string }> = {
  primary: {
    gradient: 'from-primary/20 via-primary/5 to-transparent',
    iconBg: 'bg-primary/15 text-primary border-primary/25',
    value: 'text-primary',
  },
  sky: {
    gradient: 'from-sky-400/20 via-sky-400/5 to-transparent',
    iconBg: 'bg-sky-400/15 text-sky-400 border-sky-400/25',
    value: 'text-sky-400',
  },
  amber: {
    gradient: 'from-amber-400/20 via-amber-400/5 to-transparent',
    iconBg: 'bg-amber-400/15 text-amber-400 border-amber-400/25',
    value: 'text-amber-400',
  },
  rose: {
    gradient: 'from-rose-400/20 via-rose-400/5 to-transparent',
    iconBg: 'bg-rose-400/15 text-rose-400 border-rose-400/25',
    value: 'text-rose-400',
  },
}

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  variant?: StatVariant
  className?: string
  animate?: boolean
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  variant = 'primary',
  className,
  animate = true,
}: StatCardProps) {
  const styles = VARIANT_STYLES[variant]
  const isNumeric = typeof value === 'number'
  const numericValue = isNumeric ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''))
  const suffix = isNumeric ? '' : String(value).replace(/[0-9.]/g, '')
  const canAnimate = animate && isNumeric && !Number.isNaN(numericValue)

  return (
    <Card className={cn('dashboard-stat-card metric-glow card-athletic interactive-lift h-full overflow-hidden', className)}>
      <CardContent className="relative flex h-full flex-col p-5">
        <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', styles.gradient)} />
        <div className="relative flex items-start justify-between gap-3">
          <p className="workout-label text-muted-foreground">{label}</p>
          {Icon && (
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl border', styles.iconBg)}>
              <Icon className="size-4.5" strokeWidth={2.2} />
            </span>
          )}
        </div>
        <p className={cn('relative mt-3 font-heading text-3xl font-black tracking-tight', styles.value)}>
          {canAnimate ? (
            <CountUp value={numericValue} suffix={suffix} />
          ) : (
            value
          )}
        </p>
        {hint && <p className="relative mt-auto pt-2 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
