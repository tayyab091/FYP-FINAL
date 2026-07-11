'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { AuthField } from '@/components/auth/AuthField'
import { Eye, EyeOff, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { easeTransition, fadeUp } from '@/lib/motion'

function getPostLoginPath(role: string, requestedPath: string | null) {
  const roleHome: Record<string, string> = {
    user: '/my-fitness',
    trainer: '/trainer-dashboard',
    gym_owner: '/gym-owner',
    admin: '/admin',
    super_admin: '/admin',
  }
  const fallback = roleHome[role] || '/my-fitness'
  if (!requestedPath?.startsWith('/') || requestedPath.startsWith('//')) return fallback
  if (['/login', '/signup', '/register-trainer', '/register-gym-owner'].some((path) => requestedPath.startsWith(path))) {
    return fallback
  }

  const restrictions = [
    { prefix: '/admin', roles: ['admin', 'super_admin'] },
    { prefix: '/trainer-dashboard', roles: ['trainer'] },
    { prefix: '/gym-owner', roles: ['gym_owner'] },
    { prefix: '/my-fitness', roles: ['user'] },
  ]
  const restriction = restrictions.find(({ prefix }) => requestedPath.startsWith(prefix))
  return restriction && !restriction.roles.includes(role) ? fallback : requestedPath
}

export default function LoginPage() {
  const { login, user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading || !user) return
    const redirect = searchParams.get('redirect')
    router.replace(getPostLoginPath(user.role, redirect))
  }, [authLoading, router, searchParams, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) { setError('Both fields are required'); return }
    setLoading(true)
    const result = await login(form.email, form.password)
    if (!result.success) {
      setError(result.error || 'Login failed')
      setLoading(false)
      return
    }
    toast.success('Welcome back! 👋')
    // Redirect will happen via useAuth + effect above
    setLoading(false)
  }

  if (!authLoading && user) return null

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={easeTransition}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="font-heading text-2xl font-black tracking-[-.045em] text-white lg:hidden">T.E.S.T.</Link>
          <div className="mx-auto mt-4 mb-3 flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[.08] text-primary">
            <Dumbbell className="size-6" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Sign in to continue your fitness journey</p>
          <p className="workout-label mt-2 text-primary/60">Back to the grind</p>
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ ...easeTransition, delay: 0.15 }}
          className="elite-panel rounded-3xl p-6 sm:p-8"
        >
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              label="Email address"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              required
            />

            <AuthField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Your password"
              required
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

            <Button type="submit" disabled={loading} className="mt-2 w-full py-3 text-sm font-bold">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-muted-foreground text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary hover:text-primary/80 font-medium">Sign up</Link>
            </p>
            <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground">
              <Link href="/register-trainer" className="hover:text-muted-foreground transition-colors">Register as Trainer</Link>
              <span>·</span>
              <Link href="/register-gym-owner" className="hover:text-muted-foreground transition-colors">Register your Gym</Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
