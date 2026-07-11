type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active'
type FitnessGoal = 'weight_loss' | 'muscle_gain' | 'endurance' | 'flexibility' | 'general_fitness' | string

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
}

const GOAL_ADJUSTMENTS: Record<string, number> = {
  weight_loss: -400,
  muscle_gain: 300,
  endurance: 150,
  flexibility: 0,
  general_fitness: 0,
}

export interface CalorieProfileInput {
  currentWeight?: number | null
  targetWeight?: number | null
  fitnessGoal?: FitnessGoal
  activityLevel?: ActivityLevel | string
  /** Fallback when weight is unknown (kg) */
  defaultWeight?: number
}

/** Estimate daily calorie target using Mifflin-St Jeor (approx.) with activity + goal adjustment. */
export function calculateDailyCalories(input: CalorieProfileInput): number {
  const weightKg = input.currentWeight && input.currentWeight > 0
    ? input.currentWeight
    : input.defaultWeight ?? 70

  const activity = (input.activityLevel as ActivityLevel) in ACTIVITY_MULTIPLIERS
    ? (input.activityLevel as ActivityLevel)
    : 'moderate'

  // Use weight-based estimate (no height/age on profile): BMR ≈ 22 × weight kg
  const bmr = 22 * weightKg
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity])
  const goalKey = input.fitnessGoal || 'general_fitness'
  const adjustment = GOAL_ADJUSTMENTS[goalKey] ?? 0

  return Math.max(1200, Math.round(tdee + adjustment))
}
