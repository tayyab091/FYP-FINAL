'use client'

import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { canAccessExerciseCheck } from '@/lib/access'
import { PageLoader } from '@/components/shared/PageLoader'
import { PoseDetector } from '@/components/exercise/PoseDetector'

export function ExerciseCheckGate() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <PageLoader />

  if (!user) {
    return (
      <div className="elite-panel rounded-2xl p-10 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <Lock className="size-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Sign in to use AI Form Checker</h2>
        <p className="text-muted-foreground text-sm mb-6">Pro and Elite members get real-time pose feedback.</p>
        <Link href="/login" className="btn-accent px-8 py-3 text-sm">Sign In</Link>
      </div>
    )
  }

  if (!canAccessExerciseCheck(user)) {
    return (
      <div className="elite-panel rounded-2xl p-10 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <Sparkles className="size-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Pro Feature</h2>
        <p className="text-muted-foreground text-sm mb-6">
          AI form checking is available on Pro and Elite plans. Upgrade to unlock real-time pose analysis.
        </p>
        <Link href="/subscription" className="btn-accent px-8 py-3 text-sm">Upgrade to Pro</Link>
      </div>
    )
  }

  return <PoseDetector />
}
