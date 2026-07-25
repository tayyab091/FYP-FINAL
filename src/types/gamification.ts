export interface GamificationMeResponse {
  xp: number
  level: number
  levelTitle: string
  levelDesc: string
  rank: number | null
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

export interface LeaderboardEntry {
  rank: number
  userId: string
  fullName: string
  initials: string
  level: number
  xp: number
  isCurrentUser: boolean
}

export interface GamificationLeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  me: GamificationMeResponse
}
