'use client'

import { useAuth } from '@/hooks/useAuth'
import { Dumbbell } from 'lucide-react'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { RoleExerciseLibrary } from '@/components/shared/RoleExerciseLibrary'

export default function GymOwnerExercisesPage() {
  const { user, isLoading: authLoading } = useAuth()

  if (authLoading) return <PageLoader />
  if (!user || user.role !== 'gym_owner') {
    return (
      <AccessGate
        icon={Dumbbell}
        title="Gym owner access only"
        description="Exercise library tools are available inside the gym owner workspace."
      />
    )
  }

  return (
    <RoleExerciseLibrary
      eyebrow="Facility toolkit"
      title="Exercise Library"
      description="Review the platform exercise catalog available to your trainers and members."
    />
  )
}
