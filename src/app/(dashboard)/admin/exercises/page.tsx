'use client'

import { useAuth } from '@/hooks/useAuth'
import { Shield } from 'lucide-react'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { RoleExerciseLibrary } from '@/components/shared/RoleExerciseLibrary'

export default function AdminExercisesPage() {
  const { user, isLoading: authLoading } = useAuth()

  if (authLoading) return <PageLoader />
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <AccessGate
        icon={Shield}
        title="Admin access only"
        description="Exercise library management is restricted to platform administrators."
      />
    )
  }

  return (
    <RoleExerciseLibrary
      eyebrow="Content oversight"
      title="Exercise Library"
      description="Browse the full live exercise catalog. Audit content quality, muscle coverage, and equipment diversity."
    />
  )
}
