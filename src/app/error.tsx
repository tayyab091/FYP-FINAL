'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 text-white">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-3xl font-black">Something went wrong.</h1>
        <p className="mt-3 text-[#888]">
          The request could not be completed. Retry now or return to the home page.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={unstable_retry} className="btn-accent gap-2 px-6 py-3">
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link href="/" className="rounded-full border border-white/10 px-6 py-3 text-sm font-bold hover:border-[#00ff87]/40">
            Return home
          </Link>
        </div>
      </div>
    </main>
  )
}
