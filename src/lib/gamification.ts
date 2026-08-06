import GamificationProfile from '@/models/GamificationProfile'
import WorkoutLog from '@/models/WorkoutLog'
import MealLog from '@/models/MealLog'
import Relationship from '@/models/Relationship'
import User from '@/models/User'
import { USER_AVATAR_POPULATE_SELECT, resolveAvatarUrl } from '@/lib/avatar'
import { calculateDailyCalories } from '@/lib/nutrition'
import {
  ACHIEVEMENT_DEFINITIONS,
  getAchievementDefinition,
  levelFromXp,
} from '@/lib/achievements'
import type {
  GamificationLeaderboardResponse,
  GamificationMeResponse,
  LeaderboardEntry,
} from '@/types/gamification'

export type { GamificationMeResponse, GamificationLeaderboardResponse, LeaderboardEntry } from '@/types/gamification'

export const XP_REWARDS = {
  workout_complete: 50,
  meal_log: 15,
  trainer_connected: 30,
  form_check: 25,
  progress_log: 10,
} as const

export type XpAction = keyof typeof XP_REWARDS

export async function getOrCreateProfile(userId: string) {
  let profile = await GamificationProfile.findOne({ userId })
  if (!profile) {
    profile = await GamificationProfile.create({ userId })
  }
  return profile
}

export async function computeWorkoutStreak(userId: string): Promise<number> {
  const recentDates = await WorkoutLog.find({
    userId,
    status: 'completed',
  })
    .sort({ date: -1 })
    .limit(90)
    .select('date')
    .lean()

  const daySet = new Set(
    recentDates.map((entry) => new Date(entry.date).toISOString().slice(0, 10)),
  )
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Consecutive calendar days with at least one meal log. */
export async function countMealLogStreak(userId: string): Promise<number> {
  const since = new Date()
  since.setDate(since.getDate() - 30)
  since.setHours(0, 0, 0, 0)

  const meals = await MealLog.find({
    userId,
    date: { $gte: since },
  })
    .select('date')
    .lean()

  const daySet = new Set(
    meals.map((entry) => new Date(entry.date).toISOString().slice(0, 10)),
  )

  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < 30; i += 1) {
    const day = cursor.toISOString().slice(0, 10)
    if (daySet.has(day)) {
      streak += 1
    } else {
      break
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

async function countProteinGoalStreak(userId: string): Promise<number> {
  const user = await User.findById(userId).select('currentWeight targetWeight fitnessGoal activityLevel').lean()
  if (!user) return 0

  const calorieGoal = calculateDailyCalories({
    currentWeight: user.currentWeight,
    targetWeight: user.targetWeight,
    fitnessGoal: user.fitnessGoal,
    activityLevel: user.activityLevel,
  })
  const proteinGoal = Math.round((calorieGoal * 0.3) / 4)

  const since = new Date()
  since.setDate(since.getDate() - 14)
  since.setHours(0, 0, 0, 0)

  const meals = await MealLog.find({
    userId,
    date: { $gte: since },
  })
    .select('date totalProtein')
    .lean()

  const proteinByDay = new Map<string, number>()
  for (const meal of meals) {
    const day = new Date(meal.date).toISOString().slice(0, 10)
    proteinByDay.set(day, (proteinByDay.get(day) || 0) + (meal.totalProtein || 0))
  }

  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < 14; i += 1) {
    const day = cursor.toISOString().slice(0, 10)
    const protein = proteinByDay.get(day) || 0
    if (protein >= proteinGoal * 0.8) {
      streak += 1
    } else {
      break
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

async function hasCalorieCrusherToday(userId: string): Promise<boolean> {
  const user = await User.findById(userId).select('currentWeight targetWeight fitnessGoal activityLevel').lean()
  if (!user) return false

  const calorieGoal = calculateDailyCalories({
    currentWeight: user.currentWeight,
    targetWeight: user.targetWeight,
    fitnessGoal: user.fitnessGoal,
    activityLevel: user.activityLevel,
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const meals = await MealLog.find({
    userId,
    date: { $gte: today, $lt: tomorrow },
  })
    .select('totalCalories')
    .lean()

  const totalCalories = meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0)
  if (totalCalories === 0) return false
  return Math.abs(totalCalories - calorieGoal) <= 100
}

interface AchievementContext {
  totalWorkouts: number
  streak: number
  formCheckerSessions: number
  proteinGoalStreak: number
  mealLogStreak: number
  calorieCrusherToday: boolean
  hasTrainer: boolean
}

async function buildAchievementContext(userId: string, profile: { formCheckerSessions: number }): Promise<AchievementContext> {
  const [totalWorkouts, streak, proteinGoalStreak, mealLogStreak, calorieCrusherToday, hasTrainer] = await Promise.all([
    WorkoutLog.countDocuments({ userId, status: 'completed' }),
    computeWorkoutStreak(userId),
    countProteinGoalStreak(userId),
    countMealLogStreak(userId),
    hasCalorieCrusherToday(userId),
    Relationship.exists({ userId, status: 'active' }).then(Boolean),
  ])

  return {
    totalWorkouts,
    streak,
    formCheckerSessions: profile.formCheckerSessions,
    proteinGoalStreak,
    mealLogStreak,
    calorieCrusherToday,
    hasTrainer,
  }
}

function shouldUnlockAchievement(id: string, ctx: AchievementContext): boolean {
  switch (id) {
    case 'first_workout':
      return ctx.totalWorkouts >= 1
    case 'streak_7':
      return ctx.streak >= 7
    case 'form_master':
      return ctx.formCheckerSessions >= 5
    case 'macro_master':
      return ctx.proteinGoalStreak >= 5
    case 'nutrition_pro':
      return ctx.mealLogStreak >= 7
    case 'calorie_crusher':
      return ctx.calorieCrusherToday
    case 'trainer_connected':
      return ctx.hasTrainer
    default:
      return false
  }
}

export async function checkAndUnlockAchievements(userId: string) {
  const profile = await getOrCreateProfile(userId)
  const ctx = await buildAchievementContext(userId, profile)
  const unlockedIds = new Set(profile.achievements.map((a: { id: string }) => a.id))
  const newlyUnlocked: string[] = []

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedIds.has(def.id)) continue
    if (shouldUnlockAchievement(def.id, ctx)) {
      profile.achievements.push({ id: def.id, unlockedAt: new Date() })
      newlyUnlocked.push(def.id)
    }
  }

  if (newlyUnlocked.length > 0) {
    await profile.save()
  }

  return { profile, newlyUnlocked }
}

export async function awardXp(userId: string, amount: number) {
  if (amount <= 0) return getGamificationMe(userId)

  const profile = await getOrCreateProfile(userId)
  profile.xp += amount
  const levelInfo = levelFromXp(profile.xp)
  profile.level = levelInfo.level
  await profile.save()

  await checkAndUnlockAchievements(userId)
  return getGamificationMe(userId)
}

export async function awardWorkoutXp(userId: string) {
  const streak = await computeWorkoutStreak(userId)
  const streakBonus = Math.min(streak, 7) * 5
  const total = XP_REWARDS.workout_complete + streakBonus

  const profile = await getOrCreateProfile(userId)
  profile.xp += total
  profile.streakBonusXp += streakBonus
  const levelInfo = levelFromXp(profile.xp)
  profile.level = levelInfo.level
  await profile.save()

  const { newlyUnlocked } = await checkAndUnlockAchievements(userId)
  const gamification = await getGamificationMe(userId)
  return { gamification, xpAwarded: total, streakBonus, newlyUnlocked }
}

export async function recordFormCheckSession(userId: string, reps: number) {
  const profile = await getOrCreateProfile(userId)
  profile.formCheckerSessions += 1
  await profile.save()

  const xpAmount = reps >= 5 ? XP_REWARDS.form_check + 10 : XP_REWARDS.form_check
  await awardXp(userId, xpAmount)
  const gamification = await getGamificationMe(userId)
  return { gamification, xpAwarded: xpAmount }
}

export async function computeUserRank(_userId: string, xp: number): Promise<number> {
  const higher = await GamificationProfile.countDocuments({ xp: { $gt: xp } })
  return higher + 1
}

function initialsFromName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export async function getGamificationMe(userId: string): Promise<GamificationMeResponse> {
  const profile = await getOrCreateProfile(userId)
  const [streak, rank] = await Promise.all([
    computeWorkoutStreak(userId),
    computeUserRank(userId, profile.xp),
  ])
  const levelInfo = levelFromXp(profile.xp)
  const unlockedMap = new Map<string, string | undefined>(
    profile.achievements.map((a: { id: string; unlockedAt?: Date }): [string, string | undefined] => [
      a.id,
      a.unlockedAt?.toISOString(),
    ]),
  )

  return {
    xp: profile.xp,
    level: levelInfo.level,
    levelTitle: levelInfo.title,
    levelDesc: levelInfo.desc,
    rank,
    progressToNextLevel: levelInfo.nextLevel
      ? {
          current: profile.xp,
          required: levelInfo.nextLevel.xpRequired,
          percent: levelInfo.progressPercent,
          xpRemaining: levelInfo.nextLevel.xpRemaining,
        }
      : null,
    achievements: ACHIEVEMENT_DEFINITIONS.map((def) => ({
      id: def.id,
      label: def.label,
      desc: def.desc,
      unlocked: unlockedMap.has(def.id),
      unlockedAt: unlockedMap.get(def.id) as string | undefined,
    })),
    streak,
    formCheckerSessions: profile.formCheckerSessions,
    streakBonusXp: profile.streakBonusXp,
  }
}

export async function getLeaderboard(userId: string, limit = 10): Promise<GamificationLeaderboardResponse> {
  const top = await GamificationProfile.find({})
    .sort({ xp: -1, updatedAt: 1 })
    .limit(limit)
    .select('userId xp level')
    .lean()

  const userIds = top.map((p) => p.userId)
  const users = await User.find({ _id: { $in: userIds } })
    .select(USER_AVATAR_POPULATE_SELECT)
    .lean()
  const userById = new Map(users.map((u) => [String(u._id), u]))

  const leaderboard: LeaderboardEntry[] = top.map((profile, index) => {
    const id = String(profile.userId)
    const user = userById.get(id)
    const fullName = user?.fullName || 'Member'
    const avatarUrl = resolveAvatarUrl(user) || ''
    const levelInfo = levelFromXp(profile.xp)
    return {
      rank: index + 1,
      userId: id,
      fullName,
      initials: initialsFromName(fullName),
      profileImage: avatarUrl || user?.profileImage || '',
      avatarUrl,
      level: levelInfo.level,
      xp: profile.xp,
      isCurrentUser: id === String(userId),
    }
  })

  const me = await getGamificationMe(userId)
  return { leaderboard, me }
}

export function formatNewAchievementToast(id: string) {
  const def = getAchievementDefinition(id)
  return def ? `Achievement unlocked: ${def.label}` : 'Achievement unlocked!'
}
