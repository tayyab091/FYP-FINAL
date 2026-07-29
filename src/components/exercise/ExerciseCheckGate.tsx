'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { canAccessExerciseCheck } from '@/lib/access'
import { PageLoader } from '@/components/shared/PageLoader'
import { AccessGate, SignInGate } from '@/components/shared/AccessGate'
import { PoseDetector } from '@/components/exercise/PoseDetector'

export function ExerciseCheckGate() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <PageLoader />

  if (!user) {
    return <SignInGate redirectLabel="Sign in for AI form checker" />
  }

  if (!canAccessExerciseCheck(user)) {
    return (
      <AccessGate
        icon={Sparkles}
        title="Pro feature"
        description="AI form checking is available on Pro and Elite plans. Upgrade to unlock real-time pose analysis."
        action={
          <Link href="/subscription" className="btn-accent px-8 py-3 text-sm">
            Upgrade to Pro
          </Link>
        }
      />
    )
  }

  return <PoseDetector />
}
