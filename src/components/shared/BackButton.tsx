'use client'

import { useRouter } from 'next/navigation'

export function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="group mb-6 flex items-center gap-2 text-sm text-[#a0a0a0] transition-colors hover:text-[#00ff87]"
    >
      <span className="transition-transform group-hover:-translate-x-1">←</span>
      {label}
    </button>
  )
}
