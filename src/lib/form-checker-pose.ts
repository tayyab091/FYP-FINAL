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

export const MIN_JOINT_VISIBILITY = 0.25
/** Lower bar for end joints when the pivot joint is visible (screen recordings). */
export const MIN_LENIENT_JOINT_VISIBILITY = 0.1
export const MIN_REP_HOLD_MS = 250
export const PLANK_HOLD_INCREMENT_MS = 10_000
/** Drop from extended position to count as entering a rep (helps off-angle cameras). */
export const ROM_ENTER_DELTA = 15
/** Recovery from deepest point to complete a rep (relative ROM path). */
export const ROM_EXIT_DELTA = 12
/** Minimum observed ROM span before adaptive thresholds apply. */
export const MIN_ADAPTIVE_ROM_SPAN = 2
/** Fraction of observed ROM span used for adaptive enter threshold. */
export const ADAPTIVE_ROM_ENTER_FRAC = 0.35
/** Fraction of observed ROM span used for adaptive exit threshold. */
export const ADAPTIVE_ROM_EXIT_FRAC = 0.3
export const CAMERA_HINT_AFTER_MS = 8_000
/** Minimum 2D joint-angle span required for confident good/bad scoring. */
export const CONFIDENT_ANGLE_SPAN = {
  squat: 15,
  pushup: 20,
  lunge: 15,
  plank: 12,
} as const
/** How long low span must persist (with movement) before we mark scoring unclear. */
export const CAMERA_UNCLEAR_AFTER_MS = 2_500
/** Minimum per-side angle variation to treat as user movement (not static pose). */
export const MOVEMENT_ANGLE_DELTA = 3

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

/** Fallback when strict visibility fails — pivot joint must still be clear. */
export function resolveSideLenient(
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
  if ((pb.visibility ?? 0) < MIN_JOINT_VISIBILITY) return null
  if ((pa.visibility ?? 0) < MIN_LENIENT_JOINT_VISIBILITY) return null
  if ((pc.visibility ?? 0) < MIN_LENIENT_JOINT_VISIBILITY) return null
  return {
    a: { x: pa.x * width, y: pa.y * height },
    b: { x: pb.x * width, y: pb.y * height },
    c: { x: pc.x * width, y: pc.y * height },
  }
}

/** Last resort for screen recordings where visibility scores are unreliable. */
export function resolveSidePresence(
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
  const left =
    resolveSide(lm, ex.left, width, height) ??
    resolveSideLenient(lm, ex.left, width, height) ??
    resolveSidePresence(lm, ex.left, width, height)
  const right =
    resolveSide(lm, ex.right, width, height) ??
    resolveSideLenient(lm, ex.right, width, height) ??
    resolveSidePresence(lm, ex.right, width, height)
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
  leftAngleMin: number
  leftAngleMax: number
  rightAngleMin: number
  rightAngleMax: number
  depthProxyMin: number
  depthProxyMax: number
  useDepthProxy: boolean
  peakAngleSpan: number
  /** True after we observe a near-lockout / standing frame (avoids mid-rep video start). */
  extensionCalibrated: boolean
  /** When peakAngleSpan first dropped below confident threshold while movement detected. */
  lowSpanSinceMs: number | null
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
    leftAngleMin: 180,
    leftAngleMax: 0,
    rightAngleMin: 180,
    rightAngleMax: 0,
    depthProxyMin: Infinity,
    depthProxyMax: -Infinity,
    useDepthProxy: false,
    peakAngleSpan: 0,
    extensionCalibrated: false,
    lowSpanSinceMs: null,
  }
}

function updateAngleRanges(state: FormCheckerSessionState, angles: PoseAngles): void {
  if (angles.leftAngle !== null) {
    state.leftAngleMin = Math.min(state.leftAngleMin, angles.leftAngle)
    state.leftAngleMax = Math.max(state.leftAngleMax, angles.leftAngle)
  }
  if (angles.rightAngle !== null) {
    state.rightAngleMin = Math.min(state.rightAngleMin, angles.rightAngle)
    state.rightAngleMax = Math.max(state.rightAngleMax, angles.rightAngle)
  }
}

function getKneeDepthProxy(
  lm: LandmarkPoint[],
  exercise: ExerciseKey,
  height: number,
): number | null {
  const ex = EXERCISES[exercise]
  let maxDepth = -Infinity
  for (const joints of [ex.left, ex.right]) {
    const side =
      resolveSide(lm, joints, 1, height) ??
      resolveSideLenient(lm, joints, 1, height) ??
      resolveSidePresence(lm, joints, 1, height)
    if (!side) continue
    maxDepth = Math.max(maxDepth, (side.b.y - side.a.y) / height)
  }
  return maxDepth === -Infinity ? null : maxDepth
}

function depthToPseudoAngle(
  depth: number,
  min: number,
  max: number,
  goodAngle: number,
  /** When true, smaller depth values = deeper flexion (squat/lunge knee–hip gap). */
  deeperIsMin = true,
): number {
  const span = max - min
  if (span < 0.001) return 180
  const flexionNorm = deeperIsMin ? (max - depth) / span : (depth - min) / span
  return 180 - flexionNorm * (180 - goodAngle)
}

function getSquatHipDropProxy(lm: LandmarkPoint[]): number | null {
  const hips = [LANDMARKS.leftHip, LANDMARKS.rightHip]
    .map((i) => lm[i])
    .filter((h): h is LandmarkPoint => !!h && (h.visibility ?? 0) >= MIN_LENIENT_JOINT_VISIBILITY)
  if (!hips.length) return null
  return hips.reduce((sum, h) => sum + h.y, 0) / hips.length
}

function applyDepthProxy(
  depth: number,
  state: FormCheckerSessionState,
  goodAngle: number,
  deeperIsMin: boolean,
  minSpan: number,
): number | null {
  state.depthProxyMin = Math.min(state.depthProxyMin, depth)
  state.depthProxyMax = Math.max(state.depthProxyMax, depth)
  const depthSpan = state.depthProxyMax - state.depthProxyMin
  if (depthSpan < minSpan) return null
  state.useDepthProxy = true
  return depthToPseudoAngle(depth, state.depthProxyMin, state.depthProxyMax, goodAngle, deeperIsMin)
}

function getPushupShoulderDropProxy(lm: LandmarkPoint[]): number | null {
  const shoulders = [LANDMARKS.leftShoulder, LANDMARKS.rightShoulder]
    .map((i) => lm[i])
    .filter((h): h is LandmarkPoint => !!h && (h.visibility ?? 0) >= MIN_LENIENT_JOINT_VISIBILITY)
  if (!shoulders.length) return null
  return shoulders.reduce((sum, h) => sum + h.y, 0) / shoulders.length
}

function getPushupDepthProxy(lm: LandmarkPoint[], height: number): number | null {
  let maxDrop = -Infinity
  for (const [shoulderIdx, wristIdx] of [
    [LANDMARKS.leftShoulder, LANDMARKS.leftWrist],
    [LANDMARKS.rightShoulder, LANDMARKS.rightWrist],
  ] as const) {
    const shoulder = lm[shoulderIdx]
    const wrist = lm[wristIdx]
    if (!shoulder || !wrist) continue
    if ((shoulder.visibility ?? 0) < MIN_LENIENT_JOINT_VISIBILITY) continue
    if ((wrist.visibility ?? 0) < MIN_LENIENT_JOINT_VISIBILITY) continue
    maxDrop = Math.max(maxDrop, (wrist.y - shoulder.y) * height)
  }
  return maxDrop === -Infinity ? null : maxDrop
}

/** Pick the tracking signal with the most observable ROM for rep FSM. */
export function getRepTrackingAngle(
  angles: PoseAngles,
  lm: LandmarkPoint[],
  exercise: ExerciseKey,
  width: number,
  height: number,
  state: FormCheckerSessionState,
): number {
  const ex = EXERCISES[exercise]
  updateAngleRanges(state, angles)

  const leftSpan = state.leftAngleMax - state.leftAngleMin
  const rightSpan = state.rightAngleMax - state.rightAngleMin
  const angleSpan = Math.max(leftSpan, rightSpan)
  state.peakAngleSpan = Math.max(state.peakAngleSpan, angleSpan)

  const resetDepthProxy = () => {
    state.useDepthProxy = false
    state.depthProxyMin = Infinity
    state.depthProxyMax = -Infinity
  }

  if (exercise === 'pushup') {
    const flex = getFlexionAngle(angles) ?? angles.currentAngle!
    const shoulderY = getPushupShoulderDropProxy(lm)

    if (shoulderY !== null) {
      const shoulderPseudo = applyDepthProxy(shoulderY, state, ex.goodAngle, false, 0.01)
      if (
        shoulderPseudo !== null &&
        (state.peakAngleSpan < 28 || flex > ex.goodAngle + 10)
      ) {
        return Math.min(flex, shoulderPseudo)
      }
    }

    if (state.peakAngleSpan < 15) {
      const depth = getPushupDepthProxy(lm, height)
      if (depth !== null) {
        const wristPseudo = applyDepthProxy(depth, state, ex.goodAngle, false, height * 0.015)
        if (wristPseudo !== null) return Math.min(flex, wristPseudo)
      }
    }

    resetDepthProxy()
    return flex
  }

  if (exercise === 'squat' && state.peakAngleSpan >= 8) {
    resetDepthProxy()
    if (angles.leftAngle !== null && angles.rightAngle !== null) {
      return leftSpan >= rightSpan ? angles.leftAngle : angles.rightAngle
    }
    return getFlexionAngle(angles) ?? angles.currentAngle!
  }

  if ((exercise === 'squat' || exercise === 'lunge') && state.peakAngleSpan < 8) {
    const flex = getFlexionAngle(angles) ?? angles.currentAngle!
    if (
      angles.bilateralMode === 'both' &&
      flex <= ex.goodAngle + 10
    ) {
      resetDepthProxy()
      return flex
    }

    if (exercise === 'squat') {
      const hipDrop = getSquatHipDropProxy(lm)
      if (hipDrop !== null) {
        const pseudo = applyDepthProxy(hipDrop, state, ex.goodAngle, false, 0.02)
        if (pseudo !== null) {
          return pseudo
        }
      }
    }

    const depth = getKneeDepthProxy(lm, exercise, height)
    if (depth !== null) {
      const pseudo = applyDepthProxy(depth, state, ex.goodAngle, true, 0.001)
      if (pseudo !== null) {
        return pseudo
      }
    }
  }

  if (angles.leftAngle !== null && angles.rightAngle !== null) {
    resetDepthProxy()
    return leftSpan >= rightSpan ? angles.leftAngle : angles.rightAngle
  }

  resetDepthProxy()
  return getFlexionAngle(angles) ?? angles.currentAngle!
}

function getAdaptiveRomDeltas(state: FormCheckerSessionState): { enter: number; exit: number } {
  const leftSpan = state.leftAngleMax - state.leftAngleMin
  const rightSpan = state.rightAngleMax - state.rightAngleMin
  let span = Math.max(leftSpan, rightSpan)
  if (state.useDepthProxy) {
    span = Math.max(span, (state.depthProxyMax - state.depthProxyMin) * 50)
  }
  if (span < MIN_ADAPTIVE_ROM_SPAN) {
    return { enter: ROM_ENTER_DELTA, exit: ROM_EXIT_DELTA }
  }
  return {
    enter: Math.max(1.5, span * ADAPTIVE_ROM_ENTER_FRAC),
    exit: Math.max(1.5, span * ADAPTIVE_ROM_EXIT_FRAC),
  }
}

function isUserMoving(state: FormCheckerSessionState): boolean {
  const leftSpan = state.leftAngleMax - state.leftAngleMin
  const rightSpan = state.rightAngleMax - state.rightAngleMin
  if (leftSpan >= MOVEMENT_ANGLE_DELTA || rightSpan >= MOVEMENT_ANGLE_DELTA) return true
  if (state.repState === 'down') return true
  const depthSpan = state.depthProxyMax - state.depthProxyMin
  if (state.useDepthProxy && depthSpan >= 0.02) return true
  return false
}

function hasConfidentScoring(
  exercise: ExerciseKey,
  state: FormCheckerSessionState,
): boolean {
  if (state.useDepthProxy) return false

  if (exercise === 'plank') {
    const bestAlign = Math.max(state.leftAngleMax, state.rightAngleMax)
    const worstAlign = Math.min(state.leftAngleMin, state.rightAngleMin)
    if (bestAlign >= EXERCISES.plank.goodAngle - 5) return true
    if (state.peakAngleSpan >= CONFIDENT_ANGLE_SPAN.plank) return true
    return worstAlign < EXERCISES.plank.goodAngle - 15 && state.peakAngleSpan >= 8
  }

  if (exercise === 'lunge' && !state.useDepthProxy) {
    const frontMin = Math.min(state.leftAngleMin, state.rightAngleMin)
    if (frontMin <= EXERCISES.lunge.goodAngle + 1) return true
    if (state.peakAngleSpan >= CONFIDENT_ANGLE_SPAN.lunge) return true
    return false
  }

  if (exercise === 'squat' && !state.useDepthProxy) {
    const deepest = Math.min(state.leftAngleMin, state.rightAngleMin)
    if (deepest <= EXERCISES.squat.goodAngle + 1) return true
    if (state.peakAngleSpan >= CONFIDENT_ANGLE_SPAN.squat) return true
    return false
  }

  const minSpan = CONFIDENT_ANGLE_SPAN[exercise]
  if (state.peakAngleSpan < minSpan) return false
  return true
}

function getCameraQuality(
  detected: boolean,
  angles: PoseAngles,
  peakAngleSpan: number,
  exercise: ExerciseKey,
  scoringUnclear: boolean,
): CameraQuality {
  if (!detected || angles.currentAngle === null) return 'step_back'
  const minSpan = CONFIDENT_ANGLE_SPAN[exercise]
  if (scoringUnclear || peakAngleSpan < minSpan) return 'turn_90'
  return 'side_ok'
}

const CAMERA_UNCLEAR_FEEDBACK =
  'Cannot score — camera angle unclear. Turn so your side faces the camera.'

export type ScoringState = 'good' | 'bad' | 'unscored'
export type CameraQuality = 'side_ok' | 'turn_90' | 'step_back' | 'unclear'

export interface ProcessedPoseFrame {
  detected: boolean
  feedback: string
  good: boolean
  scoringState: ScoringState
  cameraQuality: CameraQuality
  angles: PoseAngles
  formAngle: number
  useDepthProxy: boolean
  peakAngleSpan: number
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
    const emptyFeedback =
      exercise === 'pushup'
        ? 'No pose detected — place the laptop to your side and keep chest, shoulders, and arms in frame'
        : 'No pose detected — make sure your full body is visible'
    return {
      detected: false,
      feedback: emptyFeedback,
      good: false,
      scoringState: 'unscored',
      cameraQuality: 'step_back',
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
      formAngle: 0,
      useDepthProxy: false,
      peakAngleSpan: state.peakAngleSpan,
    }
  }

  const ex = EXERCISES[exercise]
  const angles = computePoseAngles(lm, exercise, width, height)

  if (angles.currentAngle === null) {
    return {
      detected: false,
      feedback: 'Move fully into frame — joints not clearly visible',
      good: false,
      scoringState: 'unscored',
      cameraQuality: 'step_back',
      angles,
      repState: state.repState,
      repCount: state.repCount,
      repCompletedThisFrame: false,
      holdSeconds: 0,
      formAngle: 0,
      useDepthProxy: false,
      peakAngleSpan: state.peakAngleSpan,
    }
  }

  const currentAngle = angles.currentAngle
  const flexionAngle = getFlexionAngle(angles) ?? currentAngle
  updateAngleRanges(state, angles)
  const leftSpan = state.leftAngleMax - state.leftAngleMin
  const rightSpan = state.rightAngleMax - state.rightAngleMin
  state.peakAngleSpan = Math.max(state.peakAngleSpan, leftSpan, rightSpan)

  const repTrackingAngle =
    exercise === 'plank'
      ? currentAngle
      : getRepTrackingAngle(angles, lm, exercise, width, height, state)
  const formAngle =
    exercise === 'plank'
      ? currentAngle
      : state.useDepthProxy
        ? repTrackingAngle
        : flexionAngle
  const romDeltas = exercise === 'plank' ? { enter: ROM_ENTER_DELTA, exit: ROM_EXIT_DELTA } : getAdaptiveRomDeltas(state)
  if (state.firstDetectedMs === null) state.firstDetectedMs = nowMs

  const minConfidentSpan = CONFIDENT_ANGLE_SPAN[exercise]
  const moving = isUserMoving(state)
  if (state.peakAngleSpan < minConfidentSpan && moving) {
    if (state.lowSpanSinceMs === null) state.lowSpanSinceMs = nowMs
  } else {
    state.lowSpanSinceMs = null
  }

  const baseConfident = hasConfidentScoring(exercise, state)
  const scoringUnclear =
    !baseConfident &&
    state.lowSpanSinceMs !== null &&
    nowMs - state.lowSpanSinceMs >= CAMERA_UNCLEAR_AFTER_MS

  const confident = baseConfident

  const rawGood =
    exercise === 'plank'
      ? formAngle >= ex.goodAngle - 1
      : formAngle <= ex.goodAngle + 1

  let scoringState: ScoringState
  if (!confident) {
    scoringState = 'unscored'
  } else {
    scoringState = rawGood ? 'good' : 'bad'
  }
  const good = scoringState === 'good'

  let feedback: string
  if (!confident) {
    if (state.useDepthProxy || scoringUnclear) {
      feedback = CAMERA_UNCLEAR_FEEDBACK
    } else if (exercise === 'plank') {
      feedback = 'Turn so your side faces the camera — full body line must be visible'
    } else if (state.peakAngleSpan < minConfidentSpan) {
      feedback =
        exercise === 'pushup'
          ? 'Turn so your side faces the camera — elbow bend must be visible'
          : 'Turn so your side faces the camera — knee bend must be visible'
    } else {
      feedback = CAMERA_UNCLEAR_FEEDBACK
    }
  } else if (
    exercise === 'lunge' &&
    angles.leftAngle !== null &&
    angles.rightAngle !== null &&
    !state.useDepthProxy
  ) {
    feedback = getLungeFeedback(angles.leftAngle, angles.rightAngle, ex, good)
  } else if (exercise === 'plank') {
    feedback = getPlankFeedback(currentAngle, ex, good, angles.left, angles.right)
  } else {
    feedback = getGradedFeedback(formAngle, ex, good)
  }

  if (
    confident &&
    exercise !== 'plank' &&
    state.repCount === 0 &&
    state.firstDetectedMs !== null &&
    nowMs - state.firstDetectedMs >= CAMERA_HINT_AFTER_MS &&
    formAngle > ex.goodAngle + 25 &&
    !state.useDepthProxy
  ) {
    feedback =
      exercise === 'pushup'
        ? 'Reps not registering — place the laptop to your side at floor level so your chest and arms are fully visible'
        : 'Reps not registering — rotate to a side profile so the camera can see your joint bend clearly'
  }

  let repCompletedThisFrame = false
  let holdSeconds = 0

  if (exercise !== 'plank') {
    const lockoutAngle = state.useDepthProxy
      ? ex.goodAngle + 15
      : ex.repAngle

    if (exercise === 'pushup' && state.useDepthProxy) {
      if (repTrackingAngle >= ex.goodAngle + 20) state.extensionCalibrated = true
      if (state.depthProxyMax - state.depthProxyMin >= 0.015) state.extensionCalibrated = true
    } else if (repTrackingAngle >= lockoutAngle - 5) {
      state.extensionCalibrated = true
    }

    if (exercise === 'pushup' && state.peakAngleSpan >= 8) {
      state.extensionCalibrated = true
    }

    if (
      exercise === 'pushup' &&
      state.firstDetectedMs !== null &&
      nowMs - state.firstDetectedMs >= 800
    ) {
      state.extensionCalibrated = true
    }

    const downFormThreshold =
      exercise === 'pushup' && state.useDepthProxy ? ex.goodAngle + 15 : ex.goodAngle + 1

    const enteredDownAbsolute =
      state.extensionCalibrated &&
      formAngle <= downFormThreshold &&
      state.repState === 'up'

    if (state.repState === 'up') {
      state.peakExtendedAngle = Math.max(state.peakExtendedAngle, repTrackingAngle)
      const romDrop = state.peakExtendedAngle - repTrackingAngle
      const enteredDownRelative =
        state.extensionCalibrated &&
        romDrop >= romDeltas.enter &&
        repTrackingAngle > ex.goodAngle

      if (enteredDownAbsolute || enteredDownRelative) {
        state.repState = 'down'
        state.downSinceMs = nowMs
        state.troughFlexionAngle = repTrackingAngle
      }
    } else {
      state.troughFlexionAngle = Math.min(state.troughFlexionAngle, repTrackingAngle)

      const exitedUpAbsolute =
        repTrackingAngle >= lockoutAngle &&
        state.downSinceMs !== null &&
        nowMs - state.downSinceMs >= MIN_REP_HOLD_MS

      const romRise = repTrackingAngle - state.troughFlexionAngle
      const exitedUpRelative =
        romRise >= romDeltas.exit &&
        state.downSinceMs !== null &&
        nowMs - state.downSinceMs >= MIN_REP_HOLD_MS

      if (exitedUpAbsolute || exitedUpRelative) {
        state.repState = 'up'
        state.downSinceMs = null
        state.repCount += 1
        state.peakExtendedAngle = repTrackingAngle
        state.troughFlexionAngle = 180
        repCompletedThisFrame = true
      }
    }
  } else if (good && confident) {
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

  const cameraQuality = getCameraQuality(
    true,
    angles,
    state.peakAngleSpan,
    exercise,
    scoringUnclear || !confident,
  )

  return {
    detected: true,
    feedback,
    good,
    scoringState,
    cameraQuality,
    angles,
    formAngle,
    useDepthProxy: state.useDepthProxy,
    peakAngleSpan: state.peakAngleSpan,
    repState: state.repState,
    repCount: state.repCount,
    repCompletedThisFrame,
    holdSeconds,
  }
}
