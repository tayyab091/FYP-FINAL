import {
  createFormCheckerSession,
  processPoseFrame,
  computePoseAngles,
  getFlexionAngle,
  type LandmarkPoint,
} from '../src/lib/form-checker-pose'

function buildPushupLandmarks(elbowAngle: number): LandmarkPoint[] {
  const lm: LandmarkPoint[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }))
  const rad = (elbowAngle * Math.PI) / 180
  const len = 0.08
  lm[11] = { x: 0.3, y: 0.4, visibility: 0.9 }
  lm[12] = { x: 0.7, y: 0.4, visibility: 0.9 }
  lm[13] = { x: 0.3 + len * Math.cos(Math.PI - rad / 2), y: 0.55, visibility: 0.9 }
  lm[14] = { x: 0.7 + len * Math.cos(Math.PI - rad / 2), y: 0.55, visibility: 0.9 }
  lm[15] = { x: 0.3 + len * 2 * Math.cos(Math.PI - rad / 2), y: 0.7, visibility: 0.9 }
  lm[16] = { x: 0.7 + len * 2 * Math.cos(Math.PI - rad / 2), y: 0.7, visibility: 0.9 }
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

runPushupRomSequence()
