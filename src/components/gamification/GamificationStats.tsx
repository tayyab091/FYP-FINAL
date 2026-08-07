'use client'

import { Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { FitnessBadge, CountUp } from '@/components/motion'
import type { GamificationMeResponse } from '@/types/gamification'

interface GamificationStatsProps {
  data: GamificationMeResponse | null
  loading?: boolean
  compact?: boolean
}

export function GamificationStats({ data, loading, compact }: GamificationStatsProps) {
  if (loading || !data) {
    return (
      <Card className="card-athletic">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          {loading ? 'Loading your XP…' : 'Complete actions to earn XP'}
        </CardContent>
      </Card>
    )
  }

  const unlockedCount = data.achievements.filter((a) => a.unlocked).length
  const progress = data.progressToNextLevel

  if (compact) {
    return (
      <Card className="card-athletic interactive-lift">
        <CardHeader>
          <CardTitle className="workout-label text-muted-foreground flex items-center gap-2">
            <Trophy className="size-4 text-primary" /> Level {data.level}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-primary">
            <CountUp value={data.xp} suffix=" XP" />
          </div>
          <p className="text-muted-foreground text-sm mt-1">{data.levelTitle} · {unlockedCount} badges</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="card-athletic interactive-lift">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" /> Your Progress
            </span>
            <FitnessBadge variant="pr">LVL {data.level}</FitnessBadge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-3xl font-black text-primary">
                <CountUp value={data.xp} suffix=" XP" />
              </div>
              <p className="text-muted-foreground text-sm mt-1">{data.levelTitle} — {data.levelDesc}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{data.streak} day streak</div>
              <div>{unlockedCount}/{data.achievements.length} badges</div>
            </div>
          </div>
          {progress && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Next level: {progress.required - progress.xpRemaining} XP</span>
                <span>{progress.percent}%</span>
              </div>
              <Progress value={progress.percent}>
                <ProgressTrack className="bg-muted h-2">
                  <ProgressIndicator className="bg-primary" />
                </ProgressTrack>
              </Progress>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`rounded-2xl border p-4 ${
              achievement.unlocked
                ? 'border-primary/30 bg-primary/[.06]'
                : 'border-border bg-white/[.02] opacity-60'
            }`}
          >
            <p className="font-bold text-sm text-foreground">{achievement.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{achievement.desc}</p>
            {achievement.unlocked && (
              <p className="text-[10px] text-primary mt-2 font-bold uppercase tracking-wide">Unlocked</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
