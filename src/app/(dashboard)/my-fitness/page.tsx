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
  const planId = searchParams.get('planId')
  return <MyFitnessInner initialTab={tabParam} planId={planId} />
}
