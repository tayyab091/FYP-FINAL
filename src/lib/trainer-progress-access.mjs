export function getTrainerClientRoleDecision(user) {
  if (!user) return { status: 401, message: 'Not authenticated' }
  if (user.role !== 'trainer') return { status: 403, message: 'Trainers only' }
  return { allowed: true }
}

export function getTrainerClientProgressDecision(relationship) {
  if (!relationship || relationship.status !== 'active') {
    return { status: 404, message: 'No active client relationship' }
  }
  return { allowed: true, canViewProgress: relationship.canViewProgress === true }
}

/**
 * Keep personal progress fields out of the database projection as well as the
 * response unless the active relationship explicitly grants that permission.
 */
export function getTrainerClientSelect(avatarSelect, canViewProgress) {
  const profileFields = canViewProgress
    ? 'country fitnessGoal activityLevel currentWeight targetWeight'
    : 'country'
  return `${avatarSelect} ${profileFields}`
}
