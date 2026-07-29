'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { SignInGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { BackButton } from '@/components/shared/BackButton'

const COUNTRIES = ['Pakistan', 'UAE', 'Saudi Arabia', 'UK', 'USA', 'Canada', 'Australia', 'Germany', 'India']
const FITNESS_GOALS = [
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'endurance', label: 'Endurance & Cardio' },
  { value: 'flexibility', label: 'Flexibility & Mobility' },
  { value: 'general_fitness', label: 'General Fitness' },
]
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (desk job, little exercise)' },
  { value: 'light', label: 'Light (1-3 workouts/week)' },
  { value: 'moderate', label: 'Moderate (3-5 workouts/week)' },
  { value: 'active', label: 'Active (6-7 workouts/week)' },
  { value: 'very_active', label: 'Very Active (twice daily training)' },
]

const BASE_TABS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'fitness', label: 'Fitness Goals', icon: '🎯' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'account', label: 'Account', icon: '⚙️' },
]

const ADMIN_TAB = { id: 'admin', label: 'Admin Controls', icon: '🛡' }
const GYM_TAB = { id: 'gym', label: 'Facility', icon: '🏢' }

export default function SettingsPage() {
  const { user, isLoading: authLoading, refreshUser, logout } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState({
    fullName: '',
    country: 'Pakistan',
    bio: '',
    profileImage: '',
    currentWeight: '',
    targetWeight: '',
    fitnessGoal: 'general_fitness',
    activityLevel: 'moderate',
  })
  const [trainerProfile, setTrainerProfile] = useState({
    specialty: '',
    bio: '',
    certifications: '',
    hourlyRate: '',
    experience: '',
  })
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const tabs =
    user?.role === 'trainer'
      ? [...BASE_TABS.slice(0, 1), { id: 'trainer', label: 'Coach Profile', icon: '🏋️' }, ...BASE_TABS.slice(1)]
      : user?.role === 'user'
        ? BASE_TABS
        : user?.role === 'gym_owner'
          ? [...BASE_TABS.filter((t) => t.id !== 'fitness'), GYM_TAB]
          : user && ['admin', 'super_admin'].includes(user.role)
            ? [...BASE_TABS.filter((t) => t.id !== 'fitness'), ADMIN_TAB]
            : BASE_TABS.filter((t) => t.id !== 'fitness')

  useEffect(() => {
    if (!user) return
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const u = data?.user
        if (u) {
          setProfile({
            fullName: u.fullName || '',
            country: u.country || 'Pakistan',
            bio: u.bio || '',
            profileImage: u.profileImage || '',
            currentWeight: u.currentWeight?.toString() || '',
            targetWeight: u.targetWeight?.toString() || '',
            fitnessGoal: u.fitnessGoal || 'general_fitness',
            activityLevel: u.activityLevel || 'moderate',
          })
        }
      })

    if (user.role === 'trainer') {
      fetch('/api/trainers/profile')
        .then((r) => (r.ok ? r.json() : null))
        .then((t) => {
          if (t) {
            setTrainerProfile({
              specialty: Array.isArray(t.specialty) ? t.specialty.join(', ') : '',
              bio: t.bio || '',
              certifications: Array.isArray(t.certifications) ? t.certifications.join(', ') : '',
              hourlyRate: t.hourlyRate?.toString() || '',
              experience: t.experience || '',
            })
          }
        })
    }
  }, [user])

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success('Account deleted')
        await logout()
        router.replace('/')
      } else {
        toast.error('Failed to delete account')
        setDeleting(false)
      }
    } catch {
      toast.error('Failed to delete account')
      setDeleting(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profile.fullName,
          country: profile.country,
          bio: profile.bio,
          profileImage: profile.profileImage,
          fitnessGoal: profile.fitnessGoal,
          activityLevel: profile.activityLevel,
          currentWeight: profile.currentWeight ? parseFloat(profile.currentWeight) : undefined,
          targetWeight: profile.targetWeight ? parseFloat(profile.targetWeight) : undefined,
        }),
      })
      if (res.ok) {
        await refreshUser()
        toast.success('Profile updated successfully!')
      } else {
        toast.error('Failed to update profile')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const saveTrainerProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/trainers/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialty: trainerProfile.specialty.split(',').map((s) => s.trim()).filter(Boolean),
          bio: trainerProfile.bio,
          certifications: trainerProfile.certifications.split(',').map((s) => s.trim()).filter(Boolean),
          hourlyRate: trainerProfile.hourlyRate ? parseFloat(trainerProfile.hourlyRate) : 0,
          experience: trainerProfile.experience,
        }),
      })
      if (res.ok) toast.success('Trainer profile updated!')
      else toast.error('Failed to update trainer profile')
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (passwords.newPass !== passwords.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (passwords.newPass.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Password changed successfully!')
        setPasswords({ current: '', newPass: '', confirm: '' })
        await logout()
      } else {
        toast.error(data.message || 'Failed to change password')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to access settings" />

  const inputClass =
    'w-full bg-[#0e1a14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] outline-none focus:border-[#00ff87] transition-colors'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-28">
      <BackButton />
      <div className="mb-8">
        <p className="section-eyebrow">Configuration</p>
        <h1 className="text-3xl font-black text-white">Settings</h1>
        <p className="mt-1 text-[#a0a0a0]">Manage your account, preferences, and security</p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-shrink-0 md:w-52">
          <div className="tile space-y-1 p-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'border border-[#00ff87]/20 bg-[#00ff87]/15 text-[#00ff87]'
                    : 'text-[#a0a0a0] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {tab === 'profile' && (
            <div className="tile space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Profile Information</h2>
                <p className="mt-1 text-sm text-[#a0a0a0]">Update your personal information</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00ff87] to-[#00d4ff] text-2xl font-black text-black">
                  {profile.fullName?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-[#a0a0a0]">Profile Image URL</label>
                  <input
                    value={profile.profileImage}
                    onChange={(e) => setProfile((p) => ({ ...p, profileImage: e.target.value }))}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs text-[#a0a0a0]">Full Name</label>
                  <input
                    value={profile.fullName}
                    onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#a0a0a0]">Country</label>
                  <select
                    value={profile.country}
                    onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
                    className={inputClass}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#a0a0a0]">Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#a0a0a0]">Email address</label>
                <input value={user.email || ''} disabled className={`${inputClass} cursor-not-allowed opacity-50`} />
              </div>
              <button type="button" onClick={saveProfile} disabled={saving} className="btn-accent w-full py-3 text-sm font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {tab === 'trainer' && (
            <div className="tile space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Coach Profile</h2>
                <p className="mt-1 text-sm text-[#a0a0a0]">Specialty, rates, and credentials</p>
              </div>
              {[
                { key: 'specialty', label: 'Specialty (comma-separated)' },
                { key: 'experience', label: 'Experience' },
                { key: 'certifications', label: 'Certifications (comma-separated)' },
                { key: 'hourlyRate', label: 'Hourly Rate' },
                { key: 'bio', label: 'Coach Bio' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 block text-xs text-[#a0a0a0]">{field.label}</label>
                  <input
                    value={trainerProfile[field.key as keyof typeof trainerProfile]}
                    onChange={(e) => setTrainerProfile((p) => ({ ...p, [field.key]: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={saveTrainerProfile}
                disabled={saving}
                className="btn-accent w-full py-3 text-sm font-bold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Coach Profile'}
              </button>
            </div>
          )}

          {tab === 'fitness' && (
            <div className="tile space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Fitness Goals</h2>
                <p className="mt-1 text-sm text-[#a0a0a0]">Set your goals to get personalized recommendations</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#a0a0a0]">Primary Goal</label>
                <select
                  value={profile.fitnessGoal}
                  onChange={(e) => setProfile((p) => ({ ...p, fitnessGoal: e.target.value }))}
                  className={inputClass}
                >
                  {FITNESS_GOALS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#a0a0a0]">Activity Level</label>
                <select
                  value={profile.activityLevel}
                  onChange={(e) => setProfile((p) => ({ ...p, activityLevel: e.target.value }))}
                  className={inputClass}
                >
                  {ACTIVITY_LEVELS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs text-[#a0a0a0]">Current Weight (kg)</label>
                  <input
                    type="number"
                    value={profile.currentWeight}
                    onChange={(e) => setProfile((p) => ({ ...p, currentWeight: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#a0a0a0]">Target Weight (kg)</label>
                  <input
                    type="number"
                    value={profile.targetWeight}
                    onChange={(e) => setProfile((p) => ({ ...p, targetWeight: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              {profile.currentWeight && (
                <div className="tile min-h-0 border-[#00ff87]/20 bg-[#00ff87]/5 py-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#00ff87]">Estimated Daily Calories</p>
                  <p className="text-2xl font-black text-white">
                    {Math.round(parseFloat(profile.currentWeight) * 24 * 1.375)} kcal
                  </p>
                </div>
              )}
              <button type="button" onClick={saveProfile} disabled={saving} className="btn-accent w-full py-3 text-sm font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Goals'}
              </button>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="tile space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
                <p className="mt-1 text-sm text-[#a0a0a0]">Choose what you want to be notified about</p>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'New message from trainer', desc: 'When your trainer sends you a message' },
                  { label: 'Workout plan assigned', desc: 'When a trainer creates a plan for you' },
                  { label: 'Meal plan assigned', desc: 'When a trainer assigns you a meal plan' },
                  { label: 'Weekly progress report', desc: 'Summary of your week every Sunday' },
                  { label: 'Achievement unlocked', desc: 'When you earn a new badge or level up' },
                  { label: 'Connection request', desc: 'When a trainer accepts your request' },
                ].map((pref) => (
                  <div key={pref.label} className="flex items-center justify-between border-b border-white/5 py-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{pref.label}</p>
                      <p className="text-xs text-[#a0a0a0]">{pref.desc}</p>
                    </div>
                    <button type="button" className="relative h-6 w-11 flex-shrink-0 rounded-full bg-[#00ff87] transition-colors">
                      <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-black" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-accent w-full py-3 text-sm font-bold">
                Save Preferences
              </button>
            </div>
          )}

          {tab === 'security' && (
            <div className="tile space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Security</h2>
                <p className="mt-1 text-sm text-[#a0a0a0]">Keep your account safe</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs text-[#a0a0a0]">Current Password</label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#a0a0a0]">New Password</label>
                  <input
                    type="password"
                    value={passwords.newPass}
                    onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#a0a0a0]">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <button type="button" onClick={changePassword} disabled={saving} className="btn-accent w-full py-3 text-sm font-bold disabled:opacity-50">
                {saving ? 'Changing...' : 'Change Password'}
              </button>
              <div className="tile mt-4 min-h-0 space-y-2 border-white/5 bg-[#111]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#a0a0a0]">Active Sessions</p>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-white">Current Session</p>
                    <p className="text-xs text-[#a0a0a0]">This device · Active now</p>
                  </div>
                  <span className="badge-accent text-xs">Active</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'admin' && (
            <div className="space-y-4">
              <div className="tile space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Admin Controls</h2>
                  <p className="mt-1 text-sm text-[#a0a0a0]">
                    Elite platform tools for verification, content, audit, and subscriptions
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { href: '/admin', label: 'Admin Console', desc: 'Overview and KPIs' },
                    { href: '/admin?tab=users', label: 'User & Role Management', desc: 'Suspend, inspect accounts' },
                    { href: '/admin?tab=verifications', label: 'Verification Queue', desc: 'Trainers and gyms' },
                    { href: '/admin?tab=audit', label: 'Audit Logs', desc: 'Security trail' },
                    { href: '/admin?tab=subscriptions', label: 'Subscription Management', desc: 'Grant, renew, revoke plans' },
                    { href: '/admin/exercises', label: 'Exercise Content', desc: 'Catalog oversight' },
                    { href: '/admin/nutrition', label: 'Nutrition Content', desc: 'Meal library oversight' },
                    { href: '/coaching', label: 'Public Site Preview', desc: 'Browse as visitors do' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-xl border border-white/10 bg-white/[.03] p-4 transition-colors hover:border-primary/40"
                    >
                      <p className="font-bold text-white">{item.label}</p>
                      <p className="mt-1 text-xs text-[#a0a0a0]">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="tile space-y-4">
                <div>
                  <h3 className="font-bold text-white">Notification Control</h3>
                  <p className="mt-1 text-sm text-[#a0a0a0]">Broadcast-style preferences for admin alerts</p>
                </div>
                {[
                  { label: 'New trainer applications', desc: 'Alert when trainers request verification' },
                  { label: 'Gym verification queue', desc: 'Alert when gyms submit documents' },
                  { label: 'User suspension events', desc: 'Track moderation activity' },
                  { label: 'Subscription upgrades', desc: 'Monitor plan changes' },
                ].map((pref) => (
                  <div key={pref.label} className="flex items-center justify-between border-b border-white/5 py-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{pref.label}</p>
                      <p className="text-xs text-[#a0a0a0]">{pref.desc}</p>
                    </div>
                    <button type="button" className="relative h-6 w-11 flex-shrink-0 rounded-full bg-[#00ff87] transition-colors">
                      <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-black" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="tile space-y-3 border-amber-500/20 bg-amber-500/5">
                <p className="text-sm font-bold text-amber-300">Safe admin tools</p>
                <p className="text-xs text-[#a0a0a0]">
                  Destructive seed and wipe actions stay CLI/env-gated. Use the admin console APIs for day-to-day moderation instead of raw database resets.
                </p>
                <Link href="/admin?tab=audit" className="inline-flex text-sm font-bold text-primary hover:underline">
                  Review recent admin actions →
                </Link>
              </div>
            </div>
          )}

          {tab === 'gym' && (
            <div className="tile space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Facility Privileges</h2>
                <p className="mt-1 text-sm text-[#a0a0a0]">Shortcuts for gym operations and content review</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { href: '/gym-owner', label: 'Gym Dashboard', desc: 'Trainers and facility profile' },
                  { href: '/gym-owner/exercises', label: 'Exercise Library', desc: 'Catalog for your coaches' },
                  { href: '/gym-owner/nutrition', label: 'Nutrition Library', desc: 'Meal recommendations' },
                  { href: '/chat', label: 'Messages', desc: 'Talk with trainers' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl border border-white/10 bg-white/[.03] p-4 transition-colors hover:border-primary/40"
                  >
                    <p className="font-bold text-white">{item.label}</p>
                    <p className="mt-1 text-xs text-[#a0a0a0]">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div className="tile space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Account</h2>
                <p className="mt-1 text-sm text-[#a0a0a0]">Manage your account data and subscription</p>
              </div>
              <div className="tile min-h-0 space-y-3 border-white/5 bg-[#111]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#a0a0a0]">Account Details</p>
                {[
                  { label: 'Email', value: user.email },
                  { label: 'Role', value: user.role },
                  { label: 'Plan', value: user.subscription?.plan || 'basic' },
                ].map((d) => (
                  <div key={d.label} className="flex items-center justify-between border-b border-white/5 py-2 last:border-0">
                    <span className="text-sm text-[#a0a0a0]">{d.label}</span>
                    <span className="text-sm font-medium capitalize text-white">{d.value}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/subscription"
                className="block w-full rounded-2xl border border-[#00ff87]/30 py-3 text-center text-sm font-bold text-[#00ff87] transition-colors hover:bg-[#00ff87]/10"
              >
                Manage Subscription →
              </Link>
              <div className="tile min-h-0 space-y-3 border-red-500/20 bg-red-500/5">
                <p className="text-sm font-bold text-red-400">⚠ Danger Zone</p>
                <p className="text-xs text-[#a0a0a0]">Deleting your account is permanent and cannot be undone.</p>
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || deleting}
                  className="w-full rounded-2xl border border-red-500/30 py-3 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-30"
                >
                  {deleting ? 'Deleting...' : 'Delete Account Permanently'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
