'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { BadgeCheck, CircleAlert } from 'lucide-react'
import { easeTransition, fadeUp } from '@/lib/motion'
import { PageLoader } from '@/components/shared/PageLoader'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setStatus('error')
          setMessage(data.message || 'Verification failed')
          return
        }
        setStatus('ok')
        setMessage(data.message || 'Email verified successfully')
      } catch {
        if (!cancelled) {
          setStatus('error')
          setMessage('Network error. Please try again.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={easeTransition}
        className="w-full max-w-md"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ ...easeTransition, delay: 0.1 }}
          className="elite-panel rounded-3xl p-8 text-center sm:p-10"
        >
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-sm text-muted-foreground">Verifying your email…</p>
            </>
          )}
          {status === 'ok' && (
            <>
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <BadgeCheck className="size-7" />
              </div>
              <h1 className="mb-2 text-xl font-bold text-white">Email verified</h1>
              <p className="mb-6 text-sm text-muted-foreground">{message}</p>
              <Link href="/login" className="btn-accent px-8 py-3 text-sm">
                Continue to sign in
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
                <CircleAlert className="size-7" />
              </div>
              <h1 className="mb-2 text-xl font-bold text-white">Verification failed</h1>
              <p className="mb-6 text-sm text-muted-foreground">{message}</p>
              <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80">
                Back to sign in
              </Link>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
