'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { AuthField } from '@/components/auth/AuthField'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { easeTransition, fadeUp } from '@/lib/motion'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) {
      toast.error('Enter a valid email')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setSent(true)
      toast.success(data.message || 'Check your email')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={easeTransition}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="font-heading text-2xl font-black tracking-[-.045em] text-white lg:hidden">
            T.E.S.T.
          </Link>
          <div className="mx-auto mt-4 mb-3 flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.08] text-primary">
            <Mail className="size-6" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-white">Forgot password</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll email you a link to reset it
          </p>
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ ...easeTransition, delay: 0.15 }}
          className="elite-panel rounded-3xl p-6 sm:p-8"
        >
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                If an account exists for that email, a reset link has been sent. Check your inbox
                (and spam folder).
              </p>
              <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <AuthField
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <Button type="submit" disabled={loading} className="w-full py-3 text-sm font-bold">
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
