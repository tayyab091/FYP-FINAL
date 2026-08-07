'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { easeTransition } from '@/lib/motion'

export type ExpandablePanelVariant = 'nutrition' | 'exercise'

const VARIANT_STYLES: Record<
  ExpandablePanelVariant,
  { gradient: string; glow: string; skeleton: string }
> = {
  nutrition: {
    gradient: 'from-primary/50 via-sky-400/25 to-primary/40',
    glow: 'shadow-[0_0_24px_rgba(34,245,154,0.1)]',
    skeleton: 'bg-primary/20',
  },
  exercise: {
    gradient: 'from-emerald-400/45 via-primary/20 to-emerald-500/35',
    glow: 'shadow-[0_0_24px_rgba(52,211,153,0.1)]',
    skeleton: 'bg-emerald-400/20',
  },
}

interface ExpandableCardPanelProps {
  children: ReactNode
  loading?: boolean
  variant?: ExpandablePanelVariant
}

function PanelSkeleton({ variant }: { variant: ExpandablePanelVariant }) {
  const accent = VARIANT_STYLES[variant].skeleton
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex gap-2">
        <div className={cn('h-10 w-10 shrink-0 rounded-lg', accent)} />
        <div className="flex-1 space-y-1.5">
          <div className={cn('h-2.5 w-2/3 rounded', accent)} />
          <div className={cn('h-2 w-1/2 rounded', accent)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={cn('h-5 w-16 rounded-full', accent)} />
        ))}
      </div>
      <div className="space-y-1.5">
        <div className={cn('h-2 w-full rounded', accent)} />
        <div className={cn('h-2 w-5/6 rounded', accent)} />
      </div>
    </div>
  )
}

export function ExpandableCardPanel({
  children,
  loading,
  variant = 'nutrition',
}: ExpandableCardPanelProps) {
  const reduceMotion = useReducedMotion()
  const styles = VARIANT_STYLES[variant]
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const styles = getComputedStyle(el)
    // #region agent log
    fetch('http://127.0.0.1:7893/ingest/3b5841b0-46ed-4652-9b9f-279e38a5ba27',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1483ff'},body:JSON.stringify({sessionId:'1483ff',location:'ExpandableCardPanel.tsx:mount',message:'panel theme styles',data:{variant,backgroundColor:styles.backgroundColor,color:styles.color,themeClass:document.documentElement.className},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  }, [variant])

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
      transition={reduceMotion ? { duration: 0 } : easeTransition}
      className="mt-3 overflow-hidden"
    >
      <div
        className={cn(
          'relative rounded-xl bg-gradient-to-br p-px',
          styles.gradient,
          styles.glow,
        )}
      >
        <div
          ref={innerRef}
          className="rounded-[11px] border border-border bg-card/95 backdrop-blur-md dark:bg-black/45"
        >
          <div className="h-36 overflow-y-auto overscroll-contain p-3 pr-2 [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--muted-foreground)_35%,transparent)_transparent]">
            {loading ? (
              <PanelSkeleton variant={variant} />
            ) : (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { ...easeTransition, delay: 0.06 }}
              >
                {children}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
