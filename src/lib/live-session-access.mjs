/**
 * Authorization policy shared by the live-session details handler and its
 * isolated regression tests. Subscription enforcement follows the join route.
 */
export function getLiveSessionReadDecision({ user, session, plan, now = Date.now() }) {
  if (!user) return { status: 401, message: 'Not authenticated' }
  if (!session) return { status: 404, message: 'Session not found' }

  const userId = String(user.userId)
  const trainerId = String(session.trainerId)
  if (userId === trainerId) return { allowed: true, isTrainer: true }

  const assignedClientId = session.clientId ? String(session.clientId) : null
  if (assignedClientId && assignedClientId !== userId) {
    return { status: 403, message: 'You are not invited to this session' }
  }

  // The join endpoint requires Elite membership for every non-trainer, even
  // when a client is explicitly assigned or has already joined.
  if (plan !== 'elite') {
    return { status: 403, message: 'Elite membership required to join live sessions' }
  }

  const endAt = new Date(session.scheduledAt).getTime() + Number(session.durationMinutes) * 60_000
  if (session.status === 'ended' || endAt < now) {
    return { status: 403, message: 'This session has ended' }
  }

  const participantIds = (session.participantIds || []).map(String)
  const alreadyJoined = participantIds.includes(userId)

  // Open group sessions are joinable by Elite members only while there is a
  // seat and the meeting has not ended. Assigned clients remain authorized
  // independent of group capacity, matching the join route.
  if (!assignedClientId) {
    if (!alreadyJoined && participantIds.length >= Number(session.maxParticipants)) {
      return { status: 403, message: 'Session is full' }
    }
  }

  return { allowed: true, isTrainer: false, alreadyJoined }
}

export function getLiveSessionMeetingDetails(session) {
  return {
    meetingProvider: session.meetingProvider || (session.dailyRoomUrl ? 'daily' : 'jitsi'),
    meetingRoomName: session.meetingRoomName || session.dailyRoomName || '',
    meetingUrl: session.meetingUrl || session.dailyRoomUrl || '',
  }
}
