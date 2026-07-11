'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

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
    switch(user.role) {
      case 'admin': case 'super_admin': router.replace('/admin'); break
      case 'trainer': router.replace('/trainer-dashboard'); break
      case 'gym_owner': router.replace('/gym-owner'); break
      default: router.replace(redirect || '/my-fitness')
    }
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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black gradient-text">T.E.S.T.</Link>
          <h1 className="text-2xl font-bold text-white mt-4 mb-1">Welcome back</h1>
          <p className="text-[#a0a0a0] text-sm">Sign in to continue your fitness journey</p>
        </div>

        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-8">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1.5">Email address</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com" required
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] outline-none focus:border-[#00ff87] transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Your password" required
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder-[#555] outline-none focus:border-[#00ff87] transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#a0a0a0] transition-colors text-lg">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-accent py-3 text-sm font-bold disabled:opacity-50 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-[#555] text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#00ff87] hover:text-[#00cc6a] font-medium">Sign up</Link>
            </p>
            <div className="flex items-center gap-4 justify-center text-xs text-[#555]">
              <Link href="/register-trainer" className="hover:text-[#a0a0a0] transition-colors">Register as Trainer</Link>
              <span>·</span>
              <Link href="/register-gym-owner" className="hover:text-[#a0a0a0] transition-colors">Register your Gym</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
