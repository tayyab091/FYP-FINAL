import { DashboardShell } from '@/components/layout/DashboardShell'
import { NO_INDEX_METADATA } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const metadata = NO_INDEX_METADATA

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
