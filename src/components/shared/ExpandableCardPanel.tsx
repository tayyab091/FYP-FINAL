'use client'

import type { ReactNode } from 'react'

interface ExpandableCardPanelProps {
  children: ReactNode
  loading?: boolean
}

export function ExpandableCardPanel({ children, loading }: ExpandableCardPanelProps) {
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="h-36 overflow-y-auto overscroll-contain pr-1 text-xs text-muted-foreground leading-relaxed">
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-5/6" />
            <div className="skeleton h-3 w-4/6" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
