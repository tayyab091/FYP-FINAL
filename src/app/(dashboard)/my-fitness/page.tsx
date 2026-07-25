'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import MyFitnessInner from './MyFitnessInner'
import { PageLoader } from '@/components/shared/PageLoader'

export default function MyFitnessPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading My Fitness" />}>
      <MyFitnessGate />
    </Suspense>
  )
}

function MyFitnessGate() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') || 'workout'
  const allowed = ['workout', 'nutrition', 'progress', 'ai-generator']
  const initialTab = allowed.includes(tabParam) ? tabParam : 'workout'
  const planId = searchParams.get('planId')
  return <MyFitnessInner initialTab={initialTab} planId={planId} />
}
