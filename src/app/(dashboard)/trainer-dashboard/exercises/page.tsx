'use client'

import { useAuth } from '@/hooks/useAuth'
import { Dumbbell } from 'lucide-react'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { RoleExerciseLibrary } from '@/components/shared/RoleExerciseLibrary'

export default function TrainerExercisesPage() {
  const { user, isLoading: authLoading } = useAuth()

  if (authLoading) return <PageLoader />
  if (!user || user.role !== 'trainer') {
    return (
      <AccessGate
        icon={Dumbbell}
        title="Trainer access only"
        description="Exercise library tools are available inside the trainer workspace."
      />
    )
  }

  return (
    <RoleExerciseLibrary
      eyebrow="Coaching toolkit"
      title="Exercise Library"
      description="Browse the full exercise catalog to build client plans and prescribe movements with confidence."
    />
  )
}
