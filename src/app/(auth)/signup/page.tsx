'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { AuthField } from '@/components/auth/AuthField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FormSelect } from '@/components/ui/form-select'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { easeTransition, fadeUp } from '@/lib/motion'

const COUNTRIES = ['Pakistan', 'UAE', 'Saudi Arabia', 'UK', 'USA', 'Canada', 'Australia', 'Germany', 'France', 'India']

export default function SignupPage() {
  const { refreshUser } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', country: 'Pakistan' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [agreed, setAgreed] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.fullName.trim() || form.fullName.length < 2) e.fullName = 'Name must be at least 2 characters'
    if (!form.email.includes('@')) e.email = 'Enter a valid email address'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    if (!agreed) e.terms = 'You must agree to the terms'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: form.fullName, email: form.email, password: form.password, country: form.country }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) setErrors({ email: data.message })
        else setErrors({ general: data.message })
        return
      }
      await refreshUser()
      toast.success('Welcome to T.E.S.T.! 🎉')
      router.replace('/my-fitness')
    } catch {
      setErrors({ general: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(err => ({ ...err, [field]: '' }))
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
          <Link href="/" className="font-heading text-2xl font-black tracking-[-.045em] text-foreground lg:hidden">T.E.S.T.</Link>
          <div className="mx-auto mt-4 mb-3 flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.08] text-primary">
            <Zap className="size-6" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground">Start your fitness journey today</p>
          <p className="workout-label mt-2 text-primary/60">Day one · Let&apos;s go</p>
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ ...easeTransition, delay: 0.15 }}
          className="elite-panel rounded-3xl p-6 sm:p-8"
        >
          {errors.general && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{errors.general}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              label="Full Name"
              value={form.fullName}
              onChange={set('fullName')}
              placeholder="Ali Hassan"
              required
              error={errors.fullName}
            />
            <AuthField
              label="Email"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@example.com"
              required
              error={errors.email}
            />
            <AuthField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Min. 8 characters"
              required
              error={errors.password}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />
            <AuthField
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              placeholder="Repeat password"
              required
              error={errors.confirmPassword}
            />

            <div>
              <Label htmlFor="country" className="mb-1.5 block text-sm font-semibold text-muted-foreground">Country</Label>
              <FormSelect id="country" value={form.country} onChange={set('country')}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </FormSelect>
            </div>

            <div className="flex items-start gap-3">
              <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 size-4 accent-primary" />
              <label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground">
                I agree to the{' '}
                <Link href="/terms" className="font-medium text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-medium text-primary hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.terms && <p className="text-xs text-red-400">{errors.terms}</p>}

            <Button type="submit" disabled={loading} className="mt-2 w-full py-3 text-sm font-bold">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">or</span>
            </div>
          </div>

          <a
            href="/api/auth/oauth/google"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[.06]"
          >
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.3-.2-1.9H12z" />
              <path fill="#34A853" d="M6.6 14.3l-.8.6-2.7 2.1C4.8 20.1 8.1 22 12 22c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 .9-3.6.9-2.8 0-5.1-1.9-5.9-4.4z" />
              <path fill="#4A90E2" d="M3.1 7.1C2.4 8.5 2 10.2 2 12s.4 3.5 1.1 4.9l3.5-2.7C6.2 13.4 6 12.7 6 12s.2-1.4.5-2.1L3.1 7.1z" />
              <path fill="#FBBC05" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9C16.9 2.7 14.7 2 12 2 8.1 2 4.8 3.9 3.1 7.1l3.4 2.7C7 7.8 9.2 5.9 12 5.9z" />
            </svg>
            Continue with Google
          </a>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">Sign in</Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
