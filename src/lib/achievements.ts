import { Trophy, Target, Medal, Flame, ScanLine, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const JOURNEY_LEVELS = [
  { level: 1, title: 'Rookie', xp: 0, desc: 'Building the habit' },
  { level: 2, title: 'Regular', xp: 250, desc: 'Showing up weekly' },
  { level: 3, title: 'Committed', xp: 750, desc: 'Training with purpose' },
  { level: 4, title: 'Elite', xp: 1500, desc: 'Living the lifestyle' },
] as const

export interface AchievementDefinition {
  id: string
  label: string
  desc: string
  icon: LucideIcon
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { id: 'first_workout', label: 'First Workout', desc: 'Show up. That\'s half the battle.', icon: Trophy },
  { id: 'macro_master', label: 'Macro Master', desc: 'Hit your protein target 5 days straight.', icon: Target },
  { id: 'streak_7', label: 'Consistency King', desc: '7-day training streak unlocked.', icon: Medal },
  { id: 'calorie_crusher', label: 'Calorie Crusher', desc: 'Stay within 100 cal of your goal.', icon: Flame },
  { id: 'form_master', label: 'Form Master', desc: 'Complete 5 AI form-check sessions.', icon: ScanLine },
  { id: 'trainer_connected', label: 'Team Player', desc: 'Connect with a verified trainer.', icon: Users },
]

export function levelFromXp(xp: number) {
  type JourneyLevel = (typeof JOURNEY_LEVELS)[number]
  let current: JourneyLevel = JOURNEY_LEVELS[0]
  for (const lvl of JOURNEY_LEVELS) {
    if (xp >= lvl.xp) current = lvl
    else break
  }
  const idx = JOURNEY_LEVELS.findIndex((l) => l.level === current.level)
  const next = JOURNEY_LEVELS[idx + 1]
  return {
    level: current.level,
    title: current.title,
    desc: current.desc,
    xpInLevel: xp - current.xp,
    nextLevel: next
      ? { level: next.level, title: next.title, xpRequired: next.xp, xpRemaining: next.xp - xp }
      : null,
    progressPercent: next
      ? Math.min(100, Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100))
      : 100,
  }
}

export function getAchievementDefinition(id: string) {
  return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id)
}
