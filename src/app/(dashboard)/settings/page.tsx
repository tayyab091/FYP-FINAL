'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SignInGate } from '@/components/shared/AccessGate'
import { PageLoader } from '@/components/shared/PageLoader'
import { FormSelect } from '@/components/ui/form-select'

interface ProfileData {
  fullName: string
  email: string
  country: string
  bio: string
  fitnessGoal: string
  activityLevel: string
  currentWeight: string
  targetWeight: string
  profileImage: string
  goalMetricCurrent: string
  goalMetricTarget: string
  goalMetricUnit: string
}

const GOAL_METRICS: Record<string, { current: string; target: string; unit: string; help: string }> = {
  weight_loss: { current: 'Current weight', target: 'Target weight', unit: 'kg', help: 'A steady, sustainable reduction in body weight.' },
  muscle_gain: { current: 'Current weight', target: 'Target weight', unit: 'kg', help: 'Track weight alongside strength and performance gains.' },
  fat_loss: { current: 'Current body fat', target: 'Target body fat', unit: '%', help: 'Focus on fat reduction while preserving lean muscle.' },
  body_recomposition: { current: 'Current body fat', target: 'Target body fat', unit: '%', help: 'Reduce fat while building or maintaining muscle.' },
  endurance: { current: 'Current 5K time', target: 'Target 5K time', unit: 'minutes', help: 'Use a consistent benchmark to measure cardiovascular progress.' },
  flexibility: { current: 'Mobility sessions now', target: 'Weekly session target', unit: 'sessions/week', help: 'Measure consistency with mobility and flexibility work.' },
  general_fitness: { current: 'Active minutes now', target: 'Weekly active-minute target', unit: 'minutes/week', help: 'Build a balanced movement habit you can sustain.' },
}

interface TrainerProfileData {
  specialty: string
  bio: string
  certifications: string
  hourlyRate: string
  experience: string
}

export default function SettingsPage() {
  const { user, isLoading: authLoading, logout, refreshUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData>({
    fullName: '', email: '', country: '', bio: '', fitnessGoal: '', activityLevel: 'moderate',
    currentWeight: '', targetWeight: '', profileImage: '', goalMetricCurrent: '', goalMetricTarget: '', goalMetricUnit: '',
  })
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPass, setChangingPass] = useState(false)
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfileData>({
    specialty: '', bio: '', certifications: '', hourlyRate: '', experience: '',
  })
  const [savingTrainer, setSavingTrainer] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const u = data?.user
        if (u) {
          setProfile({
            fullName: u.fullName || '',
            email: u.email || '',
            country: u.country || 'Pakistan',
            bio: u.bio || '',
            fitnessGoal: u.fitnessGoal || '',
            activityLevel: u.activityLevel || 'moderate',
            currentWeight: u.currentWeight?.toString() || '',
            targetWeight: u.targetWeight?.toString() || '',
            profileImage: u.profileImage || '',
            goalMetricCurrent: u.goalMetricCurrent?.toString() || '',
            goalMetricTarget: u.goalMetricTarget?.toString() || '',
            goalMetricUnit: u.goalMetricUnit || '',
          })
          setPhotoPreview(u.profileImage || '')
        }
      })
      .finally(() => setLoading(false))

    if (user.role === 'trainer') {
      fetch('/api/trainers/profile')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const t = data
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

  useEffect(() => () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  const uploadPhoto = async (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Choose a JPEG, PNG, WebP, or GIF image')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Profile image must be 4MB or smaller')
      return
    }

    const preview = URL.createObjectURL(file)
    setPhotoPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current)
      return preview
    })
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await fetch('/api/user/profile/image', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Upload failed')
      setProfile((current) => ({ ...current, profileImage: data.url }))
      setPhotoPreview(data.url)
      toast.success('Photo uploaded. Save your profile to apply it.')
    } catch (error) {
      setPhotoPreview(profile.profileImage)
      toast.error(error instanceof Error ? error.message : 'Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
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
          goalMetricCurrent: profile.goalMetricCurrent ? parseFloat(profile.goalMetricCurrent) : undefined,
          goalMetricTarget: profile.goalMetricTarget ? parseFloat(profile.goalMetricTarget) : undefined,
          goalMetricUnit: profile.goalMetricUnit,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update profile')
      toast.success('Profile updated!')
      await refreshUser()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.newPass !== passwords.confirm) return toast.error('Passwords do not match')
    if (passwords.newPass.length < 8) return toast.error('Password must be at least 8 characters')
    setChangingPass(true)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success('Password changed. Please sign in again.')
      setPasswords({ current: '', newPass: '', confirm: '' })
      await logout()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPass(false)
    }
  }

  const saveTrainerProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingTrainer(true)
    try {
      const res = await fetch('/api/trainers/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialty: trainerProfile.specialty.split(',').map(s => s.trim()).filter(Boolean),
          bio: trainerProfile.bio,
          certifications: trainerProfile.certifications.split(',').map(s => s.trim()).filter(Boolean),
          hourlyRate: trainerProfile.hourlyRate ? parseFloat(trainerProfile.hourlyRate) : 0,
          experience: trainerProfile.experience,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update trainer profile')
      toast.success('Trainer profile updated!')
      setProfile((current) => ({ ...current, bio: trainerProfile.bio }))
      await refreshUser()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update trainer profile')
    } finally {
      setSavingTrainer(false)
    }
  }

  if (authLoading) return <PageLoader />
  if (!user) return <SignInGate redirectLabel="Sign in to access settings" />
  const settingsTabs = user.role === 'user'
    ? ['profile', 'fitness', 'account']
    : user.role === 'trainer'
      ? ['profile', 'trainer', 'account']
      : ['profile', 'account']
  const goalMetric = GOAL_METRICS[profile.fitnessGoal]
  const usesWeightMetric = goalMetric?.unit === 'kg'

  return (
    <div className="min-h-screen pt-6 pb-28 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="page-hero mb-6 px-6 py-8 sm:px-8">
          <p className="eyebrow mb-2">Personalization</p>
          <h1 className="display-title text-3xl md:text-4xl">Account Settings</h1>
          <p className="mt-2 text-muted-foreground">Manage your identity, preferences, goals, and account security.</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-8">
            {settingsTabs.map(t => (
              <TabsTrigger key={t} value={t} className="capitalize">
                {t === 'fitness' ? 'Fitness Goals' : t === 'account' ? 'Account' : t === 'trainer' ? 'Trainer Profile' : 'Profile'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile">
            {loading ? <Skeleton className="h-64 bg-muted" /> : (
              <Card>
                <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={saveProfile} className="space-y-4">
                    <div className="flex flex-col gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 sm:flex-row sm:items-center">
                      <div
                        className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/15 bg-primary/[.08] bg-cover bg-center text-xl font-black text-primary"
                        style={photoPreview ? { backgroundImage: `url(${photoPreview})` } : undefined}
                        aria-label="Profile photo preview"
                      >
                        {!photoPreview && (profile.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || <Camera className="size-6" />)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">Profile photo</p>
                        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF · maximum 4MB</p>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={(event) => void uploadPhoto(event.target.files?.[0])}
                        />
                        <Button type="button" variant="outline" size="sm" className="mt-3 gap-2" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()}>
                          <Upload className="size-3.5" /> {uploadingPhoto ? 'Uploading…' : 'Choose photo'}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" value={profile.fullName}
                        onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                        autoCapitalize="words"
                        className="mt-1 bg-background border-border" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={profile.email} disabled
                        className="mt-1 bg-background border-border opacity-50" />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" value={profile.country}
                        onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                        className="mt-1 bg-background border-border" />
                    </div>
                    {user.role !== 'trainer' && (
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor="bio">{user.role === 'gym_owner' ? 'Gym Owner Bio' : 'Bio'}</Label>
                          <span className="text-[11px] text-muted-foreground">{profile.bio.length}/500 characters</span>
                        </div>
                        <textarea id="bio" value={profile.bio} maxLength={500} rows={4}
                          onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                          className="mt-1 w-full resize-y rounded-xl border border-white/[.09] bg-black/20 px-3.5 py-3 text-sm outline-none focus:border-primary/45 focus:ring-3 focus:ring-primary/10" placeholder="Tell the community about yourself" />
                      </div>
                    )}
                    <Button type="submit" disabled={saving} className="bg-primary text-black hover:brightness-95 w-full">
                      {saving ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {user.role === 'user' && <TabsContent value="fitness">
            {loading ? <Skeleton className="h-48 bg-muted" /> : (
              <Card>
                <CardHeader><CardTitle>Fitness Goals</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={saveProfile} className="space-y-4">
                    <div>
                      <Label htmlFor="fitnessGoal">Primary Goal</Label>
                      <FormSelect id="fitnessGoal" value={profile.fitnessGoal}
                        onChange={e => {
                          const fitnessGoal = e.target.value
                          setProfile(p => ({ ...p, fitnessGoal, goalMetricUnit: GOAL_METRICS[fitnessGoal]?.unit || '' }))
                        }}
                        className="mt-1">
                        <option value="">Select a goal</option>
                        <option value="weight_loss">Weight Loss</option>
                        <option value="fat_loss">Fat Loss</option>
                        <option value="body_recomposition">Body Recomposition</option>
                        <option value="muscle_gain">Muscle Gain</option>
                        <option value="endurance">Endurance</option>
                        <option value="flexibility">Flexibility</option>
                        <option value="general_fitness">General Fitness</option>
                      </FormSelect>
                    </div>
                    <div>
                      <Label htmlFor="activityLevel">Activity Level</Label>
                      <FormSelect id="activityLevel" value={profile.activityLevel}
                        onChange={e => setProfile(p => ({ ...p, activityLevel: e.target.value }))}
                        className="mt-1">
                        <option value="sedentary">Sedentary</option>
                        <option value="light">Lightly Active</option>
                        <option value="moderate">Moderately Active</option>
                        <option value="very_active">Very Active</option>
                      </FormSelect>
                    </div>
                    {goalMetric ? (
                      <div className="rounded-2xl border border-primary/15 bg-primary/[.035] p-4">
                        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{goalMetric.help}</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="goalMetricCurrent">{goalMetric.current} ({goalMetric.unit})</Label>
                            <Input id="goalMetricCurrent" type="number" min="0" step="0.1"
                              value={usesWeightMetric ? profile.currentWeight : profile.goalMetricCurrent}
                              onChange={e => setProfile(p => usesWeightMetric
                                ? ({ ...p, currentWeight: e.target.value })
                                : ({ ...p, goalMetricCurrent: e.target.value, goalMetricUnit: goalMetric.unit }))}
                              className="mt-1 bg-background border-border" />
                          </div>
                          <div>
                            <Label htmlFor="goalMetricTarget">{goalMetric.target} ({goalMetric.unit})</Label>
                            <Input id="goalMetricTarget" type="number" min="0" step="0.1"
                              value={usesWeightMetric ? profile.targetWeight : profile.goalMetricTarget}
                              onChange={e => setProfile(p => usesWeightMetric
                                ? ({ ...p, targetWeight: e.target.value })
                                : ({ ...p, goalMetricTarget: e.target.value, goalMetricUnit: goalMetric.unit }))}
                              className="mt-1 bg-background border-border" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-white/[.09] px-4 py-3 text-xs text-muted-foreground">Choose a goal to see the most relevant progress measurements.</p>
                    )}
                    <Button type="submit" disabled={saving} className="bg-primary text-black hover:brightness-95 w-full">
                      {saving ? 'Saving...' : 'Save Goals'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>}

          {user.role === 'trainer' && <TabsContent value="trainer">
            {loading ? <Skeleton className="h-64 bg-muted" /> : (
              <Card>
                <CardHeader><CardTitle>Trainer Profile</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={saveTrainerProfile} className="space-y-4">
                    <div>
                      <Label htmlFor="specialty">Specialties (comma-separated)</Label>
                      <Input id="specialty" value={trainerProfile.specialty}
                        onChange={e => setTrainerProfile(p => ({ ...p, specialty: e.target.value }))}
                        className="mt-1 bg-background border-border"
                        placeholder="Strength Training, HIIT, Nutrition" />
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">Specialties help clients find you in marketplace filters. Add only services you actively coach.</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="trainerBio">Trainer Bio</Label>
                        <span className="text-[11px] text-muted-foreground">{trainerProfile.bio.length}/500 characters</span>
                      </div>
                      <textarea id="trainerBio" value={trainerProfile.bio} maxLength={500} rows={5}
                        onChange={e => setTrainerProfile(p => ({ ...p, bio: e.target.value }))}
                        className="mt-1 w-full resize-y rounded-xl border border-white/[.09] bg-black/20 px-3.5 py-3 text-sm outline-none focus:border-primary/45 focus:ring-3 focus:ring-primary/10"
                        placeholder="Share your coaching philosophy, experience, and the clients you help." />
                    </div>
                    <div>
                      <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                      <Input id="certifications" value={trainerProfile.certifications}
                        onChange={e => setTrainerProfile(p => ({ ...p, certifications: e.target.value }))}
                        className="mt-1 bg-background border-border"
                        placeholder="ACSM, CrossFit L2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                        <Input id="hourlyRate" type="number" min="0" value={trainerProfile.hourlyRate}
                          onChange={e => setTrainerProfile(p => ({ ...p, hourlyRate: e.target.value }))}
                          className="mt-1 bg-background border-border" />
                      </div>
                      <div>
                        <Label htmlFor="experience">Experience</Label>
                        <Input id="experience" value={trainerProfile.experience}
                          onChange={e => setTrainerProfile(p => ({ ...p, experience: e.target.value }))}
                          className="mt-1 bg-background border-border"
                          placeholder="5 years" />
                      </div>
                    </div>
                    <Button type="submit" disabled={savingTrainer} className="bg-primary text-black hover:brightness-95 w-full">
                      {savingTrainer ? 'Saving...' : 'Save Trainer Profile'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>}

          <TabsContent value="account">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={changePassword} className="space-y-4">
                    <div>
                      <Label htmlFor="current">Current Password</Label>
                      <Input id="current" type="password" value={passwords.current}
                        onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                        className="mt-1 bg-background border-border" />
                    </div>
                    <div>
                      <Label htmlFor="newPass">New Password</Label>
                      <Input id="newPass" type="password" value={passwords.newPass}
                        onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                        className="mt-1 bg-background border-border" />
                    </div>
                    <div>
                      <Label htmlFor="confirm">Confirm New Password</Label>
                      <Input id="confirm" type="password" value={passwords.confirm}
                        onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                        className="mt-1 bg-background border-border" />
                    </div>
                    <Button type="submit" disabled={changingPass} className="bg-primary text-black hover:brightness-95 w-full">
                      {changingPass ? 'Changing...' : 'Change Password'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Account</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Role</div>
                      <div className="text-muted-foreground text-sm capitalize">{user.role.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="font-medium">Plan</div>
                      <div className="text-primary text-sm capitalize">{user.subscription?.plan || 'basic'}</div>
                    </div>
                  </div>
                  <Button onClick={logout} variant="destructive" className="w-full">
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

