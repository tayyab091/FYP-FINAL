'use client'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isMemberCatalogPath } from '@/lib/shell-routes'
import { DashboardShell } from './DashboardShell'

export function MemberCatalogWorkspace({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  if (!isMemberCatalogPath(pathname)) return children
  if (isLoading) return <div role="status" className="p-8">Loading your workspace?</div>
  if (user?.role === 'user') return <DashboardShell>{children}</DashboardShell>
  return children
}
