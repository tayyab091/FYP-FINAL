'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/shared/PageLoader'

export default function DashboardEntryPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login?redirect=/dashboard')
      return
    }
    const destinations = {
      user: '/my-fitness',
      trainer: '/trainer-dashboard',
      gym_owner: '/gym-owner',
      admin: '/admin',
      super_admin: '/admin',
    } as const
    const destination = destinations[user.role as keyof typeof destinations]
    router.replace(destination ?? '/settings')
  }, [isLoading, router, user])

  return <PageLoader label="Opening your workspace" />
}
