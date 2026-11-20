'use client'

import { Suspense, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from './DashboardShell'
import { Navbar } from './Navbar'

function PublicFormChecker({ children }: { children: ReactNode }) {
  return <><Navbar forceVisible /><div className="min-h-screen pt-4">{children}</div></>
}

function FormCheckerEntry({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const params = useSearchParams()
  return !user || params.get('marketing') === '1'
    ? <PublicFormChecker>{children}</PublicFormChecker>
    : <DashboardShell>{children}</DashboardShell>
}

export function DashboardRouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname !== '/exercise-check') return <DashboardShell>{children}</DashboardShell>
  return <Suspense fallback={<PublicFormChecker>{children}</PublicFormChecker>}><FormCheckerEntry>{children}</FormCheckerEntry></Suspense>
}
