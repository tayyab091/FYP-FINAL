export interface GamificationMeResponse {
  xp: number
  level: number
  levelTitle: string
  levelDesc: string
  progressToNextLevel: {
    current: number
    required: number
    percent: number
    xpRemaining: number
  } | null
  achievements: Array<{
    id: string
    label: string
    desc: string
    unlocked: boolean
    unlockedAt?: string
  }>
  streak: number
  formCheckerSessions: number
  streakBonusXp: number
}
