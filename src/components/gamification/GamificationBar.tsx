'use client'

import type { GamificationMeResponse } from '@/types/gamification'

const BADGE_DEFS = [
  { emoji: '🏋️', label: 'First Workout', id: 'first_workout' },
  { emoji: '🔥', label: '7-Day Streak', id: 'streak_7' },
  { emoji: '🥗', label: 'Nutrition Pro', id: 'nutrition_pro' },
  { emoji: '🤝', label: 'Connected', id: 'trainer_connected' },
]

function levelTitle(level: number) {
  if (level < 5) return 'Fitness Rookie'
  if (level < 10) return 'Athlete'
  return 'Champion'
}

export function GamificationBar({ data }: { data: GamificationMeResponse | null }) {
  const level = data?.level || 1
  const required = data?.progressToNextLevel?.required || 100
  const current = data?.progressToNextLevel?.current ?? (data?.xp || 0) % required
  const percent = data?.progressToNextLevel?.percent ?? Math.min(100, Math.round((current / required) * 100))
  const streak = data?.streak || 0

  return (
    <div className="tile min-h-0 w-full max-w-full flex-col gap-4 overflow-hidden py-5 md:flex-row md:flex-nowrap md:items-center md:gap-6">
      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00ff87] to-[#00d4ff]">
          <span className="text-xl font-black text-black">{level}</span>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Level</p>
          <p className="font-bold text-foreground">{data?.levelTitle || levelTitle(level)}</p>
        </div>
      </div>

      <div className="min-w-0 w-full flex-1 basis-[200px] sm:min-w-[200px]">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>{current} XP</span>
          <span>{data?.progressToNextLevel?.xpRemaining ?? Math.max(0, required - current)} XP to Level {level + 1}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #00ff87, #00d4ff)',
            }}
          />
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <span className="text-2xl" aria-hidden>🔥</span>
        <div>
          <p className="text-lg font-bold text-foreground">{streak}</p>
          <p className="text-xs text-muted-foreground">day streak</p>
        </div>
      </div>

      <div className="flex flex-shrink-0 gap-2">
        {BADGE_DEFS.map((badge) => {
          const fromApi = data?.achievements?.find((a) => a.id === badge.id || a.id.includes(badge.id))
          const earned = Boolean(fromApi?.unlocked)
          return (
            <div
              key={badge.id}
              title={badge.label}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${
                earned
                  ? 'border border-primary/30 bg-primary/15'
                  : 'bg-muted opacity-30 grayscale'
              }`}
            >
              {badge.emoji}
            </div>
          )
        })}
      </div>
    </div>
  )
}
