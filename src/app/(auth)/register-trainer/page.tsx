'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const COUNTRIES = ['Pakistan', 'UAE', 'Saudi Arabia', 'UK', 'USA', 'Canada', 'Australia', 'Germany', 'France', 'India']
const SPECIALTIES = ['HIIT', 'Yoga', 'Strength Training', 'Bodybuilding', 'CrossFit', 'Cardio', 'Pilates', 'Nutrition']
const EXPERIENCE_OPTIONS = ['Less than 1 year', '1-2 years', '3-5 years', '5-10 years', '10+ years']

export default function RegisterTrainerPage() {
  const { refreshUser } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: 'Pakistan',
    bio: '',
    experience: '',
    specialty: [] as string[],
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(err => ({ ...err, [field]: '' }))
  }

  const toggleSpecialty = (s: string) => {
    setForm(f => ({
      ...f,
      specialty: f.specialty.includes(s)
        ? f.specialty.filter(x => x !== s)
        : [...f.specialty, s],
    }))
    setErrors(err => ({ ...err, specialty: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.fullName.trim() || form.fullName.length < 2) e.fullName = 'Name must be at least 2 characters'
    if (!form.email.includes('@')) e.email = 'Enter a valid email address'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    if (form.specialty.length === 0) e.specialty = 'Select at least one specialty'
    if (!form.bio.trim()) e.bio = 'Bio is required'
    if (!form.experience) e.experience = 'Select your experience level'
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
      const res = await fetch('/api/auth/register-trainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          country: form.country,
          specialty: form.specialty,
          bio: form.bio,
          experience: form.experience,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (!res.ok) {
        setErrors({ general: data.message || 'Registration failed' })
        return
      }
      await refreshUser()
      toast.success('Account created! Pending verification.')
      router.replace('/trainer-dashboard')
    } catch {
      setErrors({ general: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black gradient-text">T.E.S.T.</Link>
          <h1 className="text-2xl font-bold text-white mt-4 mb-1">Become a Trainer</h1>
          <p className="text-[#a0a0a0] text-sm">Join Pakistan&apos;s leading fitness coaching platform</p>
        </div>

        <div className="glass rounded-2xl p-8">
          {errors.general && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{errors.general}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full Name', field: 'fullName' as const, type: 'text', placeholder: 'Ali Hassan' },
              { label: 'Email', field: 'email' as const, type: 'email', placeholder: 'you@example.com' },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-[#a0a0a0] mb-1.5">{label}</label>
                <input type={type} value={form[field]} onChange={set(field)} placeholder={placeholder} required
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] outline-none focus:border-[#00ff87] transition-colors" />
                {errors[field] && <p className="text-red-400 text-xs mt-1">{errors[field]}</p>}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Min. 8 characters" required
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder-[#555] outline-none focus:border-[#00ff87] transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] text-lg">{showPassword ? '🙈' : '👁️'}</button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1.5">Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" required
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] outline-none focus:border-[#00ff87] transition-colors" />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1.5">Country</label>
              <select value={form.country} onChange={set('country')}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#00ff87] transition-colors">
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-2">Specialties</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map(s => (
                  <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      form.specialty.includes(s)
                        ? 'bg-[#00ff87] text-black border-[#00ff87]'
                        : 'bg-transparent text-[#a0a0a0] border-[#2a2a2a] hover:border-[#3a3a3a]'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
              {errors.specialty && <p className="text-red-400 text-xs mt-1">{errors.specialty}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1.5">Bio</label>
              <textarea value={form.bio} onChange={set('bio')} rows={4} placeholder="Tell clients about your training philosophy and experience..."
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] outline-none focus:border-[#00ff87] transition-colors resize-none" />
              {errors.bio && <p className="text-red-400 text-xs mt-1">{errors.bio}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a0a0a0] mb-1.5">Experience</label>
              <select value={form.experience} onChange={set('experience')}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#00ff87] transition-colors">
                <option value="">Select experience level</option>
                {EXPERIENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {errors.experience && <p className="text-red-400 text-xs mt-1">{errors.experience}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-accent py-3 text-sm font-bold disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Register as Trainer'}
            </button>
          </form>

          <p className="text-center text-[#555] text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00ff87] hover:text-[#00cc6a] font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
