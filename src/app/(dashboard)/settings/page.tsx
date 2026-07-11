'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

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
}

export default function SettingsPage() {
  const { user, isLoading: authLoading, logout, refreshUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData>({
    fullName: '', email: '', country: '', bio: '', fitnessGoal: '', activityLevel: 'moderate',
    currentWeight: '', targetWeight: '', profileImage: '',
  })
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPass, setChangingPass] = useState(false)

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
          })
        }
      })
      .finally(() => setLoading(false))
  }, [user])

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
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Profile updated!')
      await refreshUser()
    } catch {
      toast.error('Failed to update profile')
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
      toast.success('Password changed!')
      setPasswords({ current: '', newPass: '', confirm: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPass(false)
    }
  }

  if (authLoading) return <Loader />
  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center">
      <p className="text-[#a0a0a0]">Please sign in to access settings</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-8 pb-28 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-2">Settings</h1>
        <p className="text-[#a0a0a0] mb-8">Manage your profile and account</p>

        <Tabs defaultValue="profile">
          <TabsList className="bg-[#111] border border-[#1a1a1a] mb-8">
            {['profile', 'fitness', 'account'].map(t => (
              <TabsTrigger key={t} value={t} className="capitalize data-active:bg-[#00ff87]/10 data-active:text-[#00ff87]">
                {t === 'fitness' ? 'Fitness Goals' : t === 'account' ? 'Account' : 'Profile'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile">
            {loading ? <Skeleton className="h-64 bg-[#1a1a1a]" /> : (
              <Card className="bg-[#111] border-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={saveProfile} className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" value={profile.fullName}
                        onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={profile.email} disabled
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a] opacity-50" />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" value={profile.country}
                        onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Input id="bio" value={profile.bio}
                        onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" placeholder="Tell us about yourself" />
                    </div>
                    <div>
                      <Label htmlFor="profileImage">Profile Image URL</Label>
                      <Input id="profileImage" value={profile.profileImage}
                        onChange={e => setProfile(p => ({ ...p, profileImage: e.target.value }))}
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                    </div>
                    <Button type="submit" disabled={saving} className="bg-[#00ff87] text-black hover:bg-[#00cc6a] w-full">
                      {saving ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="fitness">
            {loading ? <Skeleton className="h-48 bg-[#1a1a1a]" /> : (
              <Card className="bg-[#111] border-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Fitness Goals</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={saveProfile} className="space-y-4">
                    <div>
                      <Label htmlFor="fitnessGoal">Primary Goal</Label>
                      <select id="fitnessGoal" value={profile.fitnessGoal}
                        onChange={e => setProfile(p => ({ ...p, fitnessGoal: e.target.value }))}
                        className="mt-1 w-full h-8 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] px-2 text-sm">
                        <option value="">Select a goal</option>
                        <option value="weight_loss">Weight Loss</option>
                        <option value="muscle_gain">Muscle Gain</option>
                        <option value="endurance">Endurance</option>
                        <option value="flexibility">Flexibility</option>
                        <option value="general_fitness">General Fitness</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="activityLevel">Activity Level</Label>
                      <select id="activityLevel" value={profile.activityLevel}
                        onChange={e => setProfile(p => ({ ...p, activityLevel: e.target.value }))}
                        className="mt-1 w-full h-8 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] px-2 text-sm">
                        <option value="sedentary">Sedentary</option>
                        <option value="light">Lightly Active</option>
                        <option value="moderate">Moderately Active</option>
                        <option value="very_active">Very Active</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="currentWeight">Current Weight (kg)</Label>
                        <Input id="currentWeight" type="number" step="0.1" value={profile.currentWeight}
                          onChange={e => setProfile(p => ({ ...p, currentWeight: e.target.value }))}
                          className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                      </div>
                      <div>
                        <Label htmlFor="targetWeight">Target Weight (kg)</Label>
                        <Input id="targetWeight" type="number" step="0.1" value={profile.targetWeight}
                          onChange={e => setProfile(p => ({ ...p, targetWeight: e.target.value }))}
                          className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                      </div>
                    </div>
                    <Button type="submit" disabled={saving} className="bg-[#00ff87] text-black hover:bg-[#00cc6a] w-full">
                      {saving ? 'Saving...' : 'Save Goals'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="account">
            <div className="space-y-6">
              <Card className="bg-[#111] border-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={changePassword} className="space-y-4">
                    <div>
                      <Label htmlFor="current">Current Password</Label>
                      <Input id="current" type="password" value={passwords.current}
                        onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                    </div>
                    <div>
                      <Label htmlFor="newPass">New Password</Label>
                      <Input id="newPass" type="password" value={passwords.newPass}
                        onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                    </div>
                    <div>
                      <Label htmlFor="confirm">Confirm New Password</Label>
                      <Input id="confirm" type="password" value={passwords.confirm}
                        onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                        className="mt-1 bg-[#0a0a0a] border-[#2a2a2a]" />
                    </div>
                    <Button type="submit" disabled={changingPass} className="bg-[#00ff87] text-black hover:bg-[#00cc6a] w-full">
                      {changingPass ? 'Changing...' : 'Change Password'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-[#111] border-[#1a1a1a] text-white">
                <CardHeader><CardTitle>Account</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Role</div>
                      <div className="text-[#555] text-sm capitalize">{user.role.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="font-medium">Plan</div>
                      <div className="text-[#00ff87] text-sm capitalize">{user.subscription?.plan || 'basic'}</div>
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

function Loader() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00ff87] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
