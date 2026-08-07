import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DataTableProps {
  children: ReactNode
  className?: string
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-transparent">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  )
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border bg-white/[.02] text-left text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {children}
      </tr>
    </thead>
  )
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export function DataTableRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr className={cn('border-b border-border transition-colors hover:bg-white/[.02]', className)}>
      {children}
    </tr>
  )
}

export function DataTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3.5 align-middle', className)}>{children}</td>
}

export function DataTableHeaderCell({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 font-semibold', className)}>{children}</th>
}
