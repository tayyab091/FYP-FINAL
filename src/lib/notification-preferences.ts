export const NOTIFICATION_PREFERENCE_KEYS = [
  'chatMessages',
  'workoutPlans',
  'mealPlans',
  'weeklyProgress',
  'achievements',
  'connectionRequests',
  'communityActivity',
  'liveSessions',
  'subscriptionUpdates',
  'adminTrainerApplications',
  'adminGymVerification',
  'adminUserSuspension',
  'adminSubscriptionUpgrades',
] as const

export type NotificationPreferenceKey = (typeof NOTIFICATION_PREFERENCE_KEYS)[number]

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  chatMessages: true,
  workoutPlans: true,
  mealPlans: true,
  weeklyProgress: true,
  achievements: true,
  connectionRequests: true,
  communityActivity: true,
  liveSessions: true,
  subscriptionUpdates: true,
  adminTrainerApplications: true,
  adminGymVerification: true,
  adminUserSuspension: true,
  adminSubscriptionUpgrades: true,
}

export function normalizeNotificationPreferences(
  raw?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(raw || {}) }
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    if (typeof merged[key] !== 'boolean') {
      merged[key] = DEFAULT_NOTIFICATION_PREFERENCES[key]
    }
  }
  return merged
}

type NotificationType = 'chat' | 'workout' | 'system' | 'trainer' | 'payment' | 'community'

export function resolvePreferenceKey(input: {
  type?: NotificationType
  title: string
  message?: string
  preferenceKey?: NotificationPreferenceKey
}): NotificationPreferenceKey {
  if (input.preferenceKey) return input.preferenceKey

  const title = input.title.toLowerCase()
  const type = input.type || 'system'

  if (type === 'chat') return 'chatMessages'
  if (type === 'community') return 'communityActivity'
  if (type === 'payment') return 'subscriptionUpdates'

  if (type === 'workout') {
    if (title.includes('meal')) return 'mealPlans'
    return 'workoutPlans'
  }

  if (type === 'trainer') {
    if (title.includes('live')) return 'liveSessions'
    if (title.includes('connection') || title.includes('request') || title.includes('review')) {
      return 'connectionRequests'
    }
    return 'connectionRequests'
  }

  if (title.includes('achievement') || title.includes('badge') || title.includes('level up')) {
    return 'achievements'
  }
  if (title.includes('weekly') || title.includes('progress report')) return 'weeklyProgress'
  if (title.includes('meal plan')) return 'mealPlans'
  if (title.includes('workout plan')) return 'workoutPlans'
  if (title.includes('trainer application') || title.includes('trainer verification')) {
    return 'adminTrainerApplications'
  }
  if (title.includes('gym verification') || title.includes('gym submit')) return 'adminGymVerification'
  if (title.includes('suspension') || title.includes('suspended')) return 'adminUserSuspension'
  if (title.includes('subscription') || title.includes('plan activated')) return 'adminSubscriptionUpgrades'

  return 'chatMessages'
}

export const USER_NOTIFICATION_TOGGLES = [
  { key: 'chatMessages' as const, label: 'New message from trainer', desc: 'When your trainer sends you a message' },
  { key: 'workoutPlans' as const, label: 'Workout plan assigned', desc: 'When a trainer creates a plan for you' },
  { key: 'mealPlans' as const, label: 'Meal plan assigned', desc: 'When a trainer assigns you a meal plan' },
  { key: 'weeklyProgress' as const, label: 'Weekly progress report', desc: 'Summary of your week every Sunday' },
  { key: 'achievements' as const, label: 'Achievement unlocked', desc: 'When you earn a new badge or level up' },
  { key: 'connectionRequests' as const, label: 'Connection request', desc: 'When a trainer accepts your request' },
  { key: 'communityActivity' as const, label: 'Community activity', desc: 'Likes and comments on your posts' },
  { key: 'liveSessions' as const, label: 'Live session updates', desc: 'When a trainer schedules a live session' },
  { key: 'subscriptionUpdates' as const, label: 'Subscription updates', desc: 'Plan changes and billing confirmations' },
]

export const ADMIN_NOTIFICATION_TOGGLES = [
  { key: 'adminTrainerApplications' as const, label: 'New trainer applications', desc: 'Alert when trainers request verification' },
  { key: 'adminGymVerification' as const, label: 'Gym verification queue', desc: 'Alert when gyms submit documents' },
  { key: 'adminUserSuspension' as const, label: 'User suspension events', desc: 'Track moderation activity' },
  { key: 'adminSubscriptionUpgrades' as const, label: 'Subscription upgrades', desc: 'Monitor plan changes' },
]
