'use client'

import { useAuth } from '@/hooks/useAuth'
import { Apple } from 'lucide-react'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { RoleNutritionLibrary } from '@/components/shared/RoleNutritionLibrary'

export default function TrainerNutritionPage() {
  const { user, isLoading: authLoading } = useAuth()

  if (authLoading) return <PageLoader />
  if (!user || user.role !== 'trainer') {
    return (
      <AccessGate
        icon={Apple}
        title="Trainer access only"
        description="Nutrition library tools are available inside the trainer workspace."
      />
    )
  }

  return (
    <RoleNutritionLibrary
      eyebrow="Coaching toolkit"
      title="Nutrition Library"
      description="Browse meal options you can recommend to clients for macros, cuisine preferences, and meal planning."
      showTrainerPlans
    />
  )
}
