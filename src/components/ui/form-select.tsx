import * as React from 'react'
import { cn } from '@/lib/utils'

function FormSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="form-select"
      className={cn(
        'h-11 w-full min-w-0 appearance-none rounded-xl border border-white/[.09] bg-black/20 px-3.5 py-2 text-sm text-foreground shadow-[inset_0_1px_rgba(255,255,255,.025)] transition-all outline-none focus-visible:border-primary/45 focus-visible:bg-black/30 focus-visible:ring-3 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { FormSelect }
