'use client'

import { useAuth } from '@/hooks/useAuth'
import { Apple } from 'lucide-react'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { RoleNutritionLibrary } from '@/components/shared/RoleNutritionLibrary'

export default function GymOwnerNutritionPage() {
  const { user, isLoading: authLoading } = useAuth()

  if (authLoading) return <PageLoader />
  if (!user || user.role !== 'gym_owner') {
    return (
      <AccessGate
        icon={Apple}
        title="Gym owner access only"
        description="Nutrition library tools are available inside the gym owner workspace."
      />
    )
  }

  return (
    <RoleNutritionLibrary
      eyebrow="Facility toolkit"
      title="Nutrition Library"
      description="Browse the meal catalog your trainers can recommend to members across your facility."
    />
  )
}
