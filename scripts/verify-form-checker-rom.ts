import {
  createFormCheckerSession,
  processPoseFrame,
  computePoseAngles,
  getFlexionAngle,
  type LandmarkPoint,
} from '../src/lib/form-checker-pose'

function buildPushupLandmarks(elbowAngle: number): LandmarkPoint[] {
  const lm: LandmarkPoint[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }))
  const lenUpper = 0.1
  const lenFore = 0.1
  const rad = (elbowAngle * Math.PI) / 180
  const upperArmAngle = (125 * Math.PI) / 180

  const placeArm = (shoulderX: number, shoulderY: number, indices: [number, number, number]) => {
    const [si, ei, wi] = indices
    const shoulder = { x: shoulderX, y: shoulderY }
    const elbow = {
      x: shoulder.x + lenUpper * Math.cos(upperArmAngle),
      y: shoulder.y + lenUpper * Math.sin(upperArmAngle),
    }
    const wrist = {
      x: elbow.x + lenFore * Math.cos(upperArmAngle + Math.PI - rad),
      y: elbow.y + lenFore * Math.sin(upperArmAngle + Math.PI - rad),
    }
    lm[si] = { ...shoulder, visibility: 0.9 }
    lm[ei] = { ...elbow, visibility: 0.9 }
    lm[wi] = { ...wrist, visibility: 0.9 }
  }

  placeArm(0.3, 0.35, [11, 13, 15])
  placeArm(0.7, 0.35, [12, 14, 16])
  return lm
}

function runPushupRomSequence() {
  const state = createFormCheckerSession()
  const angles = [160, 155, 140, 133, 140, 155, 160, 150, 135, 150, 162]
  let reps = 0
  let t = 0

  for (const flex of angles) {
    const processed = processPoseFrame(buildPushupLandmarks(flex), 'pushup', 640, 480, t, state)
    if (processed.repCompletedThisFrame) reps++
    t += 400
  }

  const computed = computePoseAngles(buildPushupLandmarks(133), 'pushup', 640, 480)
  console.log('pushup_rom_test', { reps, expectedMin: 1, flexionAt133: getFlexionAngle(computed) })
  if (reps < 1) process.exitCode = 1
}

function runFrontViewPushupSequence() {
  const state = createFormCheckerSession()
  const shoulderYs = [0.38, 0.4, 0.44, 0.48, 0.44, 0.4, 0.38, 0.42, 0.47, 0.42, 0.38]
  let reps = 0
  let t = 0

  for (const shoulderY of shoulderYs) {
    const lm: LandmarkPoint[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }))
    const rad = (165 * Math.PI) / 180
    const len = 0.08
    lm[11] = { x: 0.35, y: shoulderY, visibility: 0.9 }
    lm[12] = { x: 0.65, y: shoulderY, visibility: 0.9 }
    lm[13] = { x: 0.35 + len * Math.cos(Math.PI - rad / 2), y: shoulderY + 0.12, visibility: 0.9 }
    lm[14] = { x: 0.65 + len * Math.cos(Math.PI - rad / 2), y: shoulderY + 0.12, visibility: 0.9 }
    lm[15] = { x: 0.35 + len * 2 * Math.cos(Math.PI - rad / 2), y: shoulderY + 0.22, visibility: 0.9 }
    lm[16] = { x: 0.65 + len * 2 * Math.cos(Math.PI - rad / 2), y: shoulderY + 0.22, visibility: 0.9 }

    const processed = processPoseFrame(lm, 'pushup', 640, 480, t, state)
    if (processed.repCompletedThisFrame) reps++
    t += 400
  }

  console.log('front_pushup_proxy_test', { reps, expectedMin: 1, useDepthProxy: state.useDepthProxy })
  if (reps < 1) process.exitCode = 1
}

function buildFrontSquatLandmarks(hipY: number): LandmarkPoint[] {
  const lm: LandmarkPoint[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }))
  const kneeAngle = 175
  const rad = (kneeAngle * Math.PI) / 180
  const lenUpper = 0.15
  const lenLower = 0.15
  const upperLegAngle = (110 * Math.PI) / 180

  const placeLeg = (hipX: number, indices: [number, number, number]) => {
    const [hi, ki, ai] = indices
    const hip = { x: hipX, y: hipY }
    const knee = {
      x: hip.x + lenUpper * Math.cos(upperLegAngle),
      y: hip.y + lenUpper * Math.sin(upperLegAngle),
    }
    const ankle = {
      x: knee.x + lenLower * Math.cos(upperLegAngle + Math.PI - rad),
      y: knee.y + lenLower * Math.sin(upperLegAngle + Math.PI - rad),
    }
    lm[hi] = { ...hip, visibility: 0.9 }
    lm[ki] = { ...knee, visibility: 0.9 }
    lm[ai] = { ...ankle, visibility: 0.9 }
  }

  placeLeg(0.35, [23, 25, 27])
  placeLeg(0.65, [24, 26, 28])
  return lm
}

/** P0 regression: depth-proxy ~100° must not produce scoringState "good". */
function runFrontSquatNoFalsePass() {
  const state = createFormCheckerSession()
  let last: ReturnType<typeof processPoseFrame> | null = null
  const hipYs = [0.35, 0.38, 0.42, 0.45, 0.42, 0.38, 0.35, 0.4, 0.44]
  let t = 0
  for (const hipY of hipYs) {
    last = processPoseFrame(buildFrontSquatLandmarks(hipY), 'squat', 640, 480, t, state)
    t += 400
  }

  console.log('front_squat_no_false_pass', {
    scoringState: last?.scoringState,
    useDepthProxy: state.useDepthProxy,
    formAngle: last?.formAngle,
    good: last?.good,
  })
  if (!last || last.scoringState === 'good' || last.good) process.exitCode = 1
}

runPushupRomSequence()
runFrontViewPushupSequence()
runFrontSquatNoFalsePass()
