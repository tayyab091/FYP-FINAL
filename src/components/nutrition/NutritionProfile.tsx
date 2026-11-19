'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { calculateDailyCalories } from '@/lib/nutrition'

export function NutritionProfile() {
  const { user } = useAuth()
  if (!user || user.role !== 'user') return null
  const fields = [
    ['Goal', user.fitnessGoal?.replaceAll('_', ' ') || 'Set your goal'],
    ['Current weight', user.currentWeight ? `${user.currentWeight} kg` : 'Not set'],
    ['Target weight', user.targetWeight ? `${user.targetWeight} kg` : 'Not set'],
    ['Activity', user.activityLevel?.replaceAll('_', ' ') || 'Not set'],
    ['Daily target', `${user.calorieGoal ?? calculateDailyCalories(user)} kcal`],
  ]
  return <section aria-label="Your nutrition profile" className="tile space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-foreground">{user.fullName}&apos;s nutrition profile</h2><Link href="/settings" className="text-sm font-semibold text-primary">Update profile</Link></div>
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{fields.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold capitalize text-foreground">{value}</dd></div>)}</dl>
    <Link href="/meal-plans" className="inline-block text-sm font-semibold text-primary">View or generate your diet plan →</Link>
  </section>
}
