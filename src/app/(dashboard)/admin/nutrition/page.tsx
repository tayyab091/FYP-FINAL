'use client'

import { useAuth } from '@/hooks/useAuth'
import { Shield } from 'lucide-react'
import { AccessGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { RoleNutritionLibrary } from '@/components/shared/RoleNutritionLibrary'

export default function AdminNutritionPage() {
  const { user, isLoading: authLoading } = useAuth()

  if (authLoading) return <PageLoader />
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <AccessGate
        icon={Shield}
        title="Admin access only"
        description="Meal library management is restricted to platform administrators."
      />
    )
  }

  return (
    <RoleNutritionLibrary
      eyebrow="Content oversight"
      title="Nutrition Library"
      description="Browse and audit the live meal catalog used across nutrition tools, meal plans, and user logging."
    />
  )
}
