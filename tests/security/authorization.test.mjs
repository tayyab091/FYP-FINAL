import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getLiveSessionMeetingDetails,
  getLiveSessionReadDecision,
} from '../../src/lib/live-session-access.mjs'
import {
  getTrainerClientProgressDecision,
  getTrainerClientRoleDecision,
  getTrainerClientSelect,
} from '../../src/lib/trainer-progress-access.mjs'

const futureSession = (overrides = {}) => ({
  trainerId: 'trainer-1',
  clientId: 'client-1',
  participantIds: [],
  scheduledAt: new Date(Date.now() + 60 * 60_000),
  durationMinutes: 60,
  maxParticipants: 10,
  status: 'scheduled',
  ...overrides,
})

test('live session details require authentication and an existing session', () => {
  assert.equal(getLiveSessionReadDecision({ user: null, session: futureSession() }).status, 401)
  assert.equal(getLiveSessionReadDecision({ user: { userId: 'client-1' }, session: null }).status, 404)
})

test('trainer and invited participant can read a live session; unrelated user cannot', () => {
  const session = futureSession()
  assert.equal(getLiveSessionReadDecision({
    user: { userId: 'trainer-1' }, session, plan: 'basic',
  }).allowed, true)
  assert.equal(getLiveSessionReadDecision({
    user: { userId: 'client-1' }, session, plan: 'elite',
  }).allowed, true)
  const denied = getLiveSessionReadDecision({
    user: { userId: 'other-user' }, session, plan: 'elite',
  })
  assert.equal(denied.status, 403)
  assert.equal('meetingUrl' in denied, false)
})

test('open group session access follows Elite join eligibility and capacity', () => {
  const session = futureSession({ clientId: null })
  assert.equal(getLiveSessionReadDecision({
    user: { userId: 'member' }, session, plan: 'basic',
  }).status, 403)
  assert.equal(getLiveSessionReadDecision({
    user: { userId: 'member' }, session, plan: 'elite',
  }).allowed, true)
  assert.equal(getLiveSessionReadDecision({
    user: { userId: 'member' },
    session: { ...session, participantIds: ['a', 'b'], maxParticipants: 2 },
    plan: 'elite',
  }).status, 403)
})

test('meeting details retain current Jitsi and legacy Daily fallback behavior', () => {
  assert.deepEqual(getLiveSessionMeetingDetails({
    meetingProvider: 'jitsi', meetingRoomName: 'room-new', meetingUrl: 'https://meet.jit.si/room-new',
  }), {
    meetingProvider: 'jitsi', meetingRoomName: 'room-new', meetingUrl: 'https://meet.jit.si/room-new',
  })
  assert.deepEqual(getLiveSessionMeetingDetails({
    dailyRoomName: 'room-old', dailyRoomUrl: 'https://example.daily.co/room-old',
  }), {
    meetingProvider: 'daily', meetingRoomName: 'room-old', meetingUrl: 'https://example.daily.co/room-old',
  })
})

test('trainer progress endpoint requires authentication, trainer role, and active relationship', () => {
  assert.equal(getTrainerClientRoleDecision(null).status, 401)
  assert.equal(getTrainerClientRoleDecision({ role: 'user' }).status, 403)
  assert.equal(getTrainerClientProgressDecision(null).status, 404)
  assert.equal(getTrainerClientProgressDecision({ status: 'ended', canViewProgress: true }).status, 404)
})

test('progress data projection only includes restricted profile fields when permission is granted', () => {
  const base = 'fullName profileImage avatarUrl role email'
  const denied = getTrainerClientSelect(base, false)
  assert.match(denied, /country/)
  for (const field of ['fitnessGoal', 'activityLevel', 'currentWeight', 'targetWeight']) {
    assert.doesNotMatch(denied, new RegExp(`\\b${field}\\b`))
  }

  const allowed = getTrainerClientSelect(base, true)
  for (const field of ['fitnessGoal', 'activityLevel', 'currentWeight', 'targetWeight']) {
    assert.match(allowed, new RegExp(`\\b${field}\\b`))
  }
  assert.deepEqual(getTrainerClientProgressDecision(
    { status: 'active', canViewProgress: true },
  ), { allowed: true, canViewProgress: true })
  assert.deepEqual(getTrainerClientProgressDecision(
    { status: 'active', canViewProgress: false },
  ), { allowed: true, canViewProgress: false })
})
