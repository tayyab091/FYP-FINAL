export const COMMUNITY_POST_CATEGORIES = [
  'Motivation',
  'Question',
  'Achievement',
  'Workout',
] as const

export type CommunityPostCategory = (typeof COMMUNITY_POST_CATEGORIES)[number]
