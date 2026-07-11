import { Suspense } from 'react'
import AdminPageClient from './AdminPageClient'
import { PageLoader } from '@/components/shared/PageLoader'

export default function AdminPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading admin console" />}>
      <AdminPageClient />
    </Suspense>
  )
}
