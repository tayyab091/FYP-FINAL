/**
 * Shared pose-analysis logic for live camera (PoseDetector) and offline video tests.
 * Pure functions + frame processor — no React or MediaPipe imports.
 */

export function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180) / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

export const LANDMARKS = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const

export const MIN_JOINT_VISIBILITY = 0.4
export const MIN_REP_HOLD_MS = 250
export const PLANK_HOLD_INCREMENT_MS = 10_000
/** Drop from extended position to count as entering a rep (helps off-angle cameras). */
export const ROM_ENTER_DELTA = 15
/** Recovery from deepest point to complete a rep (relative ROM path). */
export const ROM_EXIT_DELTA = 12
export const CAMERA_HINT_AFTER_MS = 8_000

export interface ExerciseDef {
  name: string
  left: [number, number, number]
  right: [number, number, number]
  goodAngle: number
  repAngle: number
  goodFeedback: string
  badFeedback: string
  citation: string
}

export const EXERCISES = {
  squat: {
    name: 'Squat',
    left: [LANDMARKS.leftHip, LANDMARKS.leftKnee, LANDMARKS.leftAnkle],
    right: [LANDMARKS.rightHip, LANDMARKS.rightKnee, LANDMARKS.rightAnkle],
    goodAngle: 100,
    repAngle: 160,
    goodFeedback: 'Great squat depth!',
    badFeedback: 'Go lower — bend knees more',
    citation:
      'NASM (7th ed.) / ACE squat-depth guidance: ~90-100° knee flexion = parallel depth. Reset angle (160°) is a best estimate.',
  },
  pushup: {
    name: 'Push-Up',
    left: [LANDMARKS.leftShoulder, LANDMARKS.leftElbow, LANDMARKS.leftWrist],
    right: [LANDMARKS.rightShoulder, LANDMARKS.rightElbow, LANDMARKS.rightWrist],
    goodAngle: 90,
    repAngle: 160,
    goodFeedback: 'Full range of motion!',
    badFeedback: 'Lower your chest more',
    citation:
      'ACE push-up test / NASM standard: ~90° elbow flexion at bottom = full rep. Reset angle (160°) is a best estimate.',
  },
  lunge: {
    name: 'Lunge',
    left: [LANDMARKS.leftHip, LANDMARKS.leftKnee, LANDMARKS.leftAnkle],
    right: [LANDMARKS.rightHip, LANDMARKS.rightKnee, LANDMARKS.rightAnkle],
    goodAngle: 100,
    repAngle: 160,
    goodFeedback: 'Perfect lunge depth!',
    badFeedback: 'Lower your back knee',
    citation:
      'Front-knee depth: NASM/ACE ~90-100° (shared with squat). Back-leg extension check (150°) is a BEST ESTIMATE.',
  },
  plank: {
    name: 'Plank',
    left: [LANDMARKS.leftShoulder, LANDMARKS.leftHip, LANDMARKS.leftAnkle],
    right: [LANDMARKS.rightShoulder, LANDMARKS.rightHip, LANDMARKS.rightAnkle],
    goodAngle: 160,
    repAngle: 0,
    goodFeedback: 'Perfect plank form!',
    badFeedback: 'Raise your hips — keep body straight',
    citation:
      'NASM straight-body-line guidance (~180°). 160° tolerance band is a BEST ESTIMATE.',
  },
} as const satisfies Record<string, ExerciseDef>

export type ExerciseKey = keyof typeof EXERCISES

export interface LandmarkPoint {
  x: number
  y: number
  visibility?: number
}

export interface ResolvedSide {
  a: { x: number; y: number }
  b: { x: number; y: number }
  c: { x: number; y: number }
}

export function resolveSide(
  lm: LandmarkPoint[],
  joints: [number, number, number],
  width: number,
  height: number,
): ResolvedSide | null {
  const [ai, bi, ci] = joints
  const pa = lm[ai]
  const pb = lm[bi]
  const pc = lm[ci]
  if (!pa || !pb || !pc) return null
  if ((pa.visibility ?? 0) < MIN_JOINT_VISIBILITY) return null
  if ((pb.visibility ?? 0) < MIN_JOINT_VISIBILITY) return null
  if ((pc.visibility ?? 0) < MIN_JOINT_VISIBILITY) return null
  return {
    a: { x: pa.x * width, y: pa.y * height },
    b: { x: pb.x * width, y: pb.y * height },
    c: { x: pc.x * width, y: pc.y * height },
  }
}

export function getGradedFeedback(currentAngle: number, ex: ExerciseDef, good: boolean): string {
  if (good) {
    const margin = ex.goodAngle - currentAngle
    return margin > 20 ? `${ex.goodFeedback} (deep rep)` : ex.goodFeedback
  }
  const delta = Math.round(currentAngle - ex.goodAngle)
  if (delta > 40) return `${ex.badFeedback} — you're only partway down (${Math.round(currentAngle)}°)`
  if (delta > 0) return `Almost there — ${delta}° more to go`
  return ex.badFeedback
}

export function getLungeFeedback(
  leftAngle: number,
  rightAngle: number,
  ex: ExerciseDef,
  frontGood: boolean,
): string {
  const front = Math.min(leftAngle, rightAngle)
  const back = Math.max(leftAngle, rightAngle)
  const BACK_LEG_EXTENDED = 150
  if (!frontGood) {
    return front > ex.goodAngle + 30 ? 'Step into a deeper lunge' : 'Almost — bend your front knee a little more'
  }
  if (back < BACK_LEG_EXTENDED) {
    return 'Extend your back leg further for a full lunge'
  }
  return ex.goodFeedback
}

export function getPlankFeedback(
  currentAngle: number,
  ex: ExerciseDef,
  good: boolean,
  left: ResolvedSide | null,
  right: ResolvedSide | null,
): string {
  if (good) return ex.goodFeedback
  const side = left ?? right
  if (side) {
    const { a: shoulder, b: hip, c: ankle } = side
    const t = ankle.x !== shoulder.x ? (hip.x - shoulder.x) / (ankle.x - shoulder.x) : 0.5
    const expectedHipY = shoulder.y + t * (ankle.y - shoulder.y)
    if (hip.y - expectedHipY > 10) return 'Hips sagging — engage your core and lift hips'
    if (expectedHipY - hip.y > 10) return 'Hips too high — lower into a straight line'
  }
  return ex.badFeedback
}

export type BilateralMode = 'both' | 'left' | 'right' | 'none'

export interface JointVisibilitySnapshot {
  left: number[]
  right: number[]
}

export interface PoseAngles {
  leftAngle: number | null
  rightAngle: number | null
  currentAngle: number | null
  bilateralMode: BilateralMode
  left: ResolvedSide | null
  right: ResolvedSide | null
  visibility: JointVisibilitySnapshot
}

export function computePoseAngles(
  lm: LandmarkPoint[],
  exercise: ExerciseKey,
  width: number,
  height: number,
): PoseAngles {
  const ex = EXERCISES[exercise]
  const left = resolveSide(lm, ex.left, width, height)
  const right = resolveSide(lm, ex.right, width, height)
  const leftAngle = left ? calculateAngle(left.a, left.b, left.c) : null
  const rightAngle = right ? calculateAngle(right.a, right.b, right.c) : null

  const visibility: JointVisibilitySnapshot = {
    left: ex.left.map((i) => lm[i]?.visibility ?? 0),
    right: ex.right.map((i) => lm[i]?.visibility ?? 0),
  }

  let bilateralMode: BilateralMode = 'none'
  let currentAngle: number | null = null
  if (leftAngle !== null && rightAngle !== null) {
    bilateralMode = 'both'
    currentAngle = (leftAngle + rightAngle) / 2
  } else if (leftAngle !== null) {
    bilateralMode = 'left'
    currentAngle = leftAngle
  } else if (rightAngle !== null) {
    bilateralMode = 'right'
    currentAngle = rightAngle
  }

  return { leftAngle, rightAngle, currentAngle, bilateralMode, left, right, visibility }
}

/** Smaller angle = deeper flexion. Prefer the more-bent side when both are visible. */
export function getFlexionAngle(angles: PoseAngles): number | null {
  const { leftAngle, rightAngle, currentAngle } = angles
  if (leftAngle !== null && rightAngle !== null) {
    return Math.min(leftAngle, rightAngle)
  }
  return currentAngle
}

export interface FormCheckerSessionState {
  repState: 'up' | 'down'
  downSinceMs: number | null
  repCount: number
  plankHoldStartMs: number | null
  plankHoldCreditedMs: number
  /** Highest flexion angle while arms/legs extended (relative ROM). */
  peakExtendedAngle: number
  /** Deepest flexion angle during current rep (relative ROM). */
  troughFlexionAngle: number
  firstDetectedMs: number | null
}

export function createFormCheckerSession(): FormCheckerSessionState {
  return {
    repState: 'up',
    downSinceMs: null,
    repCount: 0,
    plankHoldStartMs: null,
    plankHoldCreditedMs: 0,
    peakExtendedAngle: 0,
    troughFlexionAngle: 180,
    firstDetectedMs: null,
  }
}

export interface ProcessedPoseFrame {
  detected: boolean
  feedback: string
  good: boolean
  angles: PoseAngles
  repState: 'up' | 'down'
  repCount: number
  repCompletedThisFrame: boolean
  holdSeconds: number
}

export function processPoseFrame(
  lm: LandmarkPoint[] | undefined,
  exercise: ExerciseKey,
  width: number,
  height: number,
  nowMs: number,
  state: FormCheckerSessionState,
): ProcessedPoseFrame {
  if (!lm || lm.length === 0) {
    return {
      detected: false,
      feedback: 'No pose detected — make sure your full body is visible',
      good: false,
      angles: {
        leftAngle: null,
        rightAngle: null,
        currentAngle: null,
        bilateralMode: 'none',
        left: null,
        right: null,
        visibility: { left: [], right: [] },
      },
      repState: state.repState,
      repCount: state.repCount,
      repCompletedThisFrame: false,
      holdSeconds: 0,
    }
  }

  const ex = EXERCISES[exercise]
  const angles = computePoseAngles(lm, exercise, width, height)

  if (angles.currentAngle === null) {
    return {
      detected: false,
      feedback: 'Move fully into frame — joints not clearly visible',
      good: false,
      angles,
      repState: state.repState,
      repCount: state.repCount,
      repCompletedThisFrame: false,
      holdSeconds: 0,
    }
  }

  const currentAngle = angles.currentAngle
  const flexionAngle = getFlexionAngle(angles) ?? currentAngle
  if (state.firstDetectedMs === null) state.firstDetectedMs = nowMs

  const good =
    exercise === 'plank' ? currentAngle >= ex.goodAngle : flexionAngle <= ex.goodAngle

  let feedback: string
  if (exercise === 'lunge' && angles.leftAngle !== null && angles.rightAngle !== null) {
    feedback = getLungeFeedback(angles.leftAngle, angles.rightAngle, ex, good)
  } else if (exercise === 'plank') {
    feedback = getPlankFeedback(currentAngle, ex, good, angles.left, angles.right)
  } else {
    feedback = getGradedFeedback(flexionAngle, ex, good)
  }

  if (
    exercise !== 'plank' &&
    state.repCount === 0 &&
    state.firstDetectedMs !== null &&
    nowMs - state.firstDetectedMs >= CAMERA_HINT_AFTER_MS &&
    flexionAngle > ex.goodAngle + 25
  ) {
    feedback =
      'Reps not registering — rotate to a side profile so the camera can see your joint bend clearly'
  }

  let repCompletedThisFrame = false
  let holdSeconds = 0

  if (exercise !== 'plank') {
    const enteredDownAbsolute = flexionAngle <= ex.goodAngle && state.repState === 'up'

    if (state.repState === 'up') {
      state.peakExtendedAngle = Math.max(state.peakExtendedAngle, flexionAngle)
      const enteredDownRelative =
        state.peakExtendedAngle - flexionAngle >= ROM_ENTER_DELTA && flexionAngle > ex.goodAngle

      if (enteredDownAbsolute || enteredDownRelative) {
        state.repState = 'down'
        state.downSinceMs = nowMs
        state.troughFlexionAngle = flexionAngle
      }
    } else {
      state.troughFlexionAngle = Math.min(state.troughFlexionAngle, flexionAngle)

      const exitedUpAbsolute =
        flexionAngle >= ex.repAngle &&
        state.downSinceMs !== null &&
        nowMs - state.downSinceMs >= MIN_REP_HOLD_MS

      const exitedUpRelative =
        flexionAngle - state.troughFlexionAngle >= ROM_EXIT_DELTA &&
        state.downSinceMs !== null &&
        nowMs - state.downSinceMs >= MIN_REP_HOLD_MS

      if (exitedUpAbsolute || exitedUpRelative) {
        state.repState = 'up'
        state.downSinceMs = null
        state.repCount += 1
        state.peakExtendedAngle = flexionAngle
        state.troughFlexionAngle = 180
        repCompletedThisFrame = true
      }
    }
  } else if (good) {
    if (state.plankHoldStartMs === null) state.plankHoldStartMs = nowMs
    const heldMs = nowMs - state.plankHoldStartMs
    holdSeconds = Math.floor(heldMs / 1000)
    if (heldMs - state.plankHoldCreditedMs >= PLANK_HOLD_INCREMENT_MS) {
      state.plankHoldCreditedMs += PLANK_HOLD_INCREMENT_MS
      state.repCount += 1
      repCompletedThisFrame = true
    }
  } else {
    state.plankHoldStartMs = null
    state.plankHoldCreditedMs = 0
    holdSeconds = 0
  }

  return {
    detected: true,
    feedback,
    good,
    angles,
    repState: state.repState,
    repCount: state.repCount,
    repCompletedThisFrame,
    holdSeconds,
  }
}
