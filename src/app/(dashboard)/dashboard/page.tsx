'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardEntryPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !user) return
    const destinations = {
      user: '/my-fitness',
      trainer: '/trainer-dashboard',
      gym_owner: '/gym-owner',
      admin: '/admin',
      super_admin: '/admin',
    } as const
    router.replace(destinations[user.role])
  }, [isLoading, router, user])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#00ff87] border-t-transparent" />
        <p className="mt-4 text-sm text-[#777]">Opening your workspace...</p>
      </div>
    </div>
  )
}
