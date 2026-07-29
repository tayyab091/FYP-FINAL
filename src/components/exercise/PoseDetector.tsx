'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Square, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { RepCounter } from '@/components/motion/RepCounter'
import { FitnessBadge } from '@/components/motion/FitnessBadge'

/**
 * Standard 2D interior-angle-at-vertex formula (vertex = point `b`), e.g. the
 * knee for a hip-knee-ankle triple. Computed on normalized (x, y) landmark
 * output — no depth/z correction for camera angle or lens distortion, which
 * is a known limitation of single-camera 2D pose estimation for exercise
 * form analysis (see e.g. Chen et al., "Pose Trainer: Correcting Exercise
 * Posture using Pose Estimation", 2020, arXiv:2006.11718, §3 — 2D angle
 * approximations are noted as adequate for sagittal-plane movements viewed
 * side-on, but degrade for frontal-plane faults like knee valgus).
 */
function calculateAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs(radians * 180 / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

/**
 * MediaPipe BlazePose 33-landmark indices used across exercises.
 * https://developers.google.com/mediapipe/solutions/vision/pose_landmarker#pose_landmarker_model
 * Every joint is read bilaterally (left AND right) — a single side is used
 * as a fallback only when the other side's landmark visibility is too low
 * (e.g. the user is angled/turned away from the camera on one side).
 */
const LANDMARKS = {
  leftShoulder: 11, rightShoulder: 12,
  leftElbow: 13, rightElbow: 14,
  leftWrist: 15, rightWrist: 16,
  leftHip: 23, rightHip: 24,
  leftKnee: 25, rightKnee: 26,
  leftAnkle: 27, rightAnkle: 28,
}

/**
 * Minimum per-landmark `visibility` score (MediaPipe's own confidence
 * estimate, 0-1) required before a joint is trusted for angle math.
 * 0.5 matches MediaPipe's documented default `minDetectionConfidence` /
 * `minTrackingConfidence` (see pose.setOptions below) and the value used
 * for the skeleton-overlay drawing, so angle math and the visible overlay
 * now agree (previously angle math ignored visibility entirely — see
 * FORM_CHECKER_AUDIT.md §5).
 */
const MIN_JOINT_VISIBILITY = 0.5

/**
 * Minimum time (ms) a rep must spend in the "down"/bottom position before
 * the "up"/lockout threshold can complete it. This is a best-estimate
 * anti-cheat/anti-noise guard (not derived from a specific biomechanics
 * source) added to reduce the FSM counting very fast, partial-range
 * "reps" that merely graze both angle thresholds — see
 * FORM_CHECKER_AUDIT.md §6/§11 item 5. Flagged as BEST ESTIMATE.
 */
const MIN_REP_HOLD_MS = 250

/** Continuous good-form hold (ms) worth 1 "rep" for isometric holds (Plank). BEST ESTIMATE. */
const PLANK_HOLD_INCREMENT_MS = 10_000

interface ExerciseDef {
  name: string
  /** [proximal, vertex, distal] landmark indices, left + right side. */
  left: [number, number, number]
  right: [number, number, number]
  goodAngle: number
  repAngle: number
  goodFeedback: string
  badFeedback: string
  /** Source / provenance note for goodAngle + repAngle, surfaced in the UI and audit doc. */
  citation: string
}

const EXERCISES: Record<string, ExerciseDef> = {
  squat: {
    name: 'Squat',
    left: [LANDMARKS.leftHip, LANDMARKS.leftKnee, LANDMARKS.leftAnkle],
    right: [LANDMARKS.rightHip, LANDMARKS.rightKnee, LANDMARKS.rightAnkle],
    // NASM Essentials of Personal Fitness Training (7th ed.) describes a
    // "parallel" squat as the thighs reaching roughly parallel to the floor,
    // which corresponds to ~90-100 deg of knee flexion; ACE's Squat
    // Assessment guidance uses the same ~90 deg depth benchmark for a
    // full-depth bodyweight squat. 160 deg (near-but-not-locked knee
    // extension) is a best-estimate "top of rep" reset threshold.
    goodAngle: 100,
    repAngle: 160,
    goodFeedback: 'Great squat depth!',
    badFeedback: 'Go lower — bend knees more',
    citation: 'NASM (7th ed.) / ACE squat-depth guidance: ~90-100° knee flexion = parallel depth. Reset angle (160°) is a best estimate.',
  },
  pushup: {
    name: 'Push-Up',
    left: [LANDMARKS.leftShoulder, LANDMARKS.leftElbow, LANDMARKS.leftWrist],
    right: [LANDMARKS.rightShoulder, LANDMARKS.rightElbow, LANDMARKS.rightWrist],
    // ACE's push-up test protocol and NASM push-up form standards both
    // define a "full" rep as the chest lowering until the upper arm is
    // roughly parallel to the floor, i.e. ~90 deg of elbow flexion.
    goodAngle: 90,
    repAngle: 160,
    goodFeedback: 'Full range of motion!',
    badFeedback: 'Lower your chest more',
    citation: 'ACE push-up test / NASM standard: ~90° elbow flexion at bottom = full rep. Reset angle (160°) is a best estimate.',
  },
  lunge: {
    name: 'Lunge',
    left: [LANDMARKS.leftHip, LANDMARKS.leftKnee, LANDMARKS.leftAnkle],
    right: [LANDMARKS.rightHip, LANDMARKS.rightKnee, LANDMARKS.rightAnkle],
    // Front-knee depth uses the same ~90-100° parallel-thigh benchmark as
    // the squat (NASM/ACE). Unlike the squat, both legs are tracked so the
    // BACK leg's extension can be checked independently (see
    // getLungeFeedback below) — this was previously not implemented
    // (audit §6: "lunge scored exactly like a squat"). The back-leg
    // extension threshold (150°) is a BEST ESTIMATE, not independently cited.
    goodAngle: 100,
    repAngle: 160,
    goodFeedback: 'Perfect lunge depth!',
    badFeedback: 'Lower your back knee',
    citation: 'Front-knee depth: NASM/ACE ~90-100° (shared with squat). Back-leg extension check (150°) is a BEST ESTIMATE.',
  },
  plank: {
    name: 'Plank',
    left: [LANDMARKS.leftShoulder, LANDMARKS.leftHip, LANDMARKS.leftAnkle],
    right: [LANDMARKS.rightShoulder, LANDMARKS.rightHip, LANDMARKS.rightAnkle],
    // NASM plank-form guidance: shoulders, hips and ankles should form a
    // single straight line (~180°). 160° is used as a tolerance band around
    // that ideal rather than a strict citation of "160" specifically —
    // flagged as a BEST ESTIMATE tolerance, not an exact published figure.
    goodAngle: 160,
    repAngle: 0,
    goodFeedback: 'Perfect plank form!',
    badFeedback: 'Raise your hips — keep body straight',
    citation: 'NASM straight-body-line guidance (~180°). 160° tolerance band is a BEST ESTIMATE.',
  },
}

type ExerciseKey = keyof typeof EXERCISES

interface LandmarkPoint { x: number; y: number; visibility?: number }

/** Resolve a joint triple to pixel-space points, or null if any point fails the visibility gate. */
function resolveSide(
  lm: LandmarkPoint[],
  joints: [number, number, number],
  width: number,
  height: number,
): { a: { x: number; y: number }; b: { x: number; y: number }; c: { x: number; y: number } } | null {
  const [ai, bi, ci] = joints
  const pa = lm[ai], pb = lm[bi], pc = lm[ci]
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

export function PoseDetector() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseKey>('squat')
  const [repCount, setRepCount] = useState(0)
  const [feedback, setFeedback] = useState('Get in position to start')
  const [angle, setAngle] = useState(0)
  const [isGoodForm, setIsGoodForm] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [holdSeconds, setHoldSeconds] = useState(0)
  const repStateRef = useRef<'up' | 'down'>('up')
  const downSinceRef = useRef<number | null>(null)
  const sessionRepsRef = useRef(0)
  const plankHoldStartRef = useRef<number | null>(null)
  const plankHoldCreditedMsRef = useRef(0)
  const poseRef = useRef<InstanceType<typeof import('@mediapipe/pose').Pose> | null>(null)
  const cameraRef = useRef<{ stop: () => void; start: () => Promise<void> } | null>(null)

  interface PoseResults {
    image: CanvasImageSource
    poseLandmarks?: LandmarkPoint[]
  }

  const onResults = useCallback((results: PoseResults) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')!
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(results.image, 0, 0)

    if (!results.poseLandmarks) {
      setFeedback('No pose detected — make sure your full body is visible')
      return
    }

    const lm = results.poseLandmarks
    const ex = EXERCISES[selectedExercise]

    const left = resolveSide(lm, ex.left, canvas.width, canvas.height)
    const right = resolveSide(lm, ex.right, canvas.width, canvas.height)
    const leftAngle = left ? calculateAngle(left.a, left.b, left.c) : null
    const rightAngle = right ? calculateAngle(right.a, right.b, right.c) : null

    if (leftAngle === null && rightAngle === null) {
      setFeedback('Move fully into frame — joints not clearly visible')
      return
    }

    // Bilateral: average both sides when both are confidently visible,
    // otherwise fall back to whichever side is visible (audit §3/§5 fix —
    // previously only the left side was ever read).
    const currentAngle =
      leftAngle !== null && rightAngle !== null
        ? (leftAngle + rightAngle) / 2
        : (leftAngle ?? rightAngle)!
    setAngle(Math.round(currentAngle))

    const good = selectedExercise === 'plank'
      ? currentAngle >= ex.goodAngle
      : currentAngle <= ex.goodAngle

    setIsGoodForm(good)

    // Specific, graded cues instead of a flat good/bad binary (audit §6).
    let cueText: string
    if (selectedExercise === 'lunge' && leftAngle !== null && rightAngle !== null) {
      cueText = getLungeFeedback(leftAngle, rightAngle, ex, good)
    } else if (selectedExercise === 'plank') {
      cueText = getPlankFeedback(currentAngle, ex, good, left, right)
    } else {
      cueText = getGradedFeedback(currentAngle, ex, good)
    }
    setFeedback(cueText)

    const now = performance.now()

    if (selectedExercise !== 'plank') {
      if (currentAngle <= ex.goodAngle && repStateRef.current === 'up') {
        repStateRef.current = 'down'
        downSinceRef.current = now
      } else if (
        currentAngle >= ex.repAngle &&
        repStateRef.current === 'down' &&
        downSinceRef.current !== null &&
        now - downSinceRef.current >= MIN_REP_HOLD_MS
      ) {
        repStateRef.current = 'up'
        downSinceRef.current = null
        setRepCount(c => {
          const next = c + 1
          sessionRepsRef.current = next
          return next
        })
      }
    } else {
      // Plank has no concentric/eccentric rep cycle — instead we credit
      // continuous good-form hold time in PLANK_HOLD_INCREMENT_MS chunks so
      // a plank-only session can still register progress/XP (fixes audit
      // §8: "plank cannot earn XP through the normal flow").
      if (good) {
        if (plankHoldStartRef.current === null) plankHoldStartRef.current = now
        const heldMs = now - plankHoldStartRef.current
        setHoldSeconds(Math.floor(heldMs / 1000))
        if (heldMs - plankHoldCreditedMsRef.current >= PLANK_HOLD_INCREMENT_MS) {
          plankHoldCreditedMsRef.current += PLANK_HOLD_INCREMENT_MS
          setRepCount(c => {
            const next = c + 1
            sessionRepsRef.current = next
            return next
          })
        }
      } else {
        plankHoldStartRef.current = null
        plankHoldCreditedMsRef.current = 0
        setHoldSeconds(0)
      }
    }

    const POSE_CONNECTIONS = (window as Window & { POSE_CONNECTIONS?: [number, number][] }).POSE_CONNECTIONS
    if (POSE_CONNECTIONS) {
      ctx.strokeStyle = '#22f59a'
      ctx.lineWidth = 2
      POSE_CONNECTIONS.forEach(([s, e]) => {
        const start = lm[s], end = lm[e]
        if ((start.visibility ?? 0) > MIN_JOINT_VISIBILITY && (end.visibility ?? 0) > MIN_JOINT_VISIBILITY) {
          ctx.beginPath()
          ctx.moveTo(start.x * canvas.width, start.y * canvas.height)
          ctx.lineTo(end.x * canvas.width, end.y * canvas.height)
          ctx.stroke()
        }
      })
    }

    lm.forEach((point) => {
      if ((point.visibility ?? 0) > MIN_JOINT_VISIBILITY) {
        ctx.fillStyle = '#22f59a'
        ctx.beginPath()
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    })

    ctx.fillStyle = 'white'
    ctx.font = 'bold 20px sans-serif'
    const labelPoint = left?.b ?? right?.b
    if (labelPoint) ctx.fillText(`${Math.round(currentAngle)}°`, labelPoint.x + 10, labelPoint.y - 10)
  }, [selectedExercise])

  const startCamera = useCallback(async () => {
    try {
      const { Pose, POSE_CONNECTIONS } = await import('@mediapipe/pose')
      const { Camera } = await import('@mediapipe/camera_utils')

      ;(window as Window & { POSE_CONNECTIONS?: [number, number][] }).POSE_CONNECTIONS = POSE_CONNECTIONS

      const pose = new Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      })
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        // MediaPipe-documented defaults; also reused as MIN_JOINT_VISIBILITY
        // above so angle math and detection confidence stay consistent.
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      pose.onResults((results) => onResults(results as PoseResults))
      poseRef.current = pose

      const camera = new Camera(videoRef.current!, {
        onFrame: async () => { await pose.send({ image: videoRef.current! }) },
        width: 640,
        height: 480,
      })
      await camera.start()
      cameraRef.current = camera
      setIsActive(true)
      setCameraError('')
      sessionRepsRef.current = 0
      downSinceRef.current = null
      plankHoldStartRef.current = null
      plankHoldCreditedMsRef.current = 0
    } catch {
      setCameraError('Camera access denied or not available. Allow camera permissions and refresh.')
    }
  }, [onResults])

  const stopCamera = useCallback(() => {
    const reps = sessionRepsRef.current
    const exercise = EXERCISES[selectedExercise].name

    cameraRef.current?.stop()
    cameraRef.current = null
    void poseRef.current?.close()
    poseRef.current = null
    setIsActive(false)
    setRepCount(0)
    setHoldSeconds(0)
    sessionRepsRef.current = 0
    downSinceRef.current = null
    plankHoldStartRef.current = null
    plankHoldCreditedMsRef.current = 0
    setFeedback('Get in position to start')

    if (reps > 0) {
      fetch('/api/gamification/form-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise, reps }),
      })
        .then(async (res) => {
          const data = await res.json()
          if (!res.ok) return
          toast.success(`+${data.xpAwarded} XP for form check session`)
          if (Array.isArray(data.gamification?.achievements)) {
            const unlocked = data.gamification.achievements.filter(
              (a: { unlocked: boolean; unlockedAt?: string }) => a.unlocked && a.unlockedAt,
            )
            const latest = unlocked[unlocked.length - 1]
            if (latest?.label) toast.success(`Achievement unlocked: ${latest.label}`)
          }
        })
        .catch(() => {})
    }
  }, [selectedExercise])

  useEffect(() => {
    return () => {
      cameraRef.current?.stop()
      void poseRef.current?.close()
    }
  }, [])

  const isPlank = selectedExercise === 'plank'

  return (
    <div className="space-y-6">
      <div className="elite-panel flex flex-wrap justify-center gap-2 p-3">
        {Object.entries(EXERCISES).map(([key, ex]) => (
          <button key={key}
            onClick={() => { setSelectedExercise(key as ExerciseKey); setRepCount(0) }}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              selectedExercise === key
                ? 'bg-primary text-primary-foreground border-primary shadow-[0_8px_24px_rgba(34,245,154,.16)]'
                : 'bg-white/[.02] text-[#8f9a94] border-white/[.08] hover:border-white/[.16] hover:text-white'
            }`}>
            {ex.name}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-[#6b756f]" title={EXERCISES[selectedExercise].citation}>
        Threshold source: {EXERCISES[selectedExercise].citation}
      </p>

      <div className="relative rounded-3xl overflow-hidden bg-[#0b0e0c] aspect-video max-w-2xl mx-auto border border-white/[.1] shadow-[0_30px_90px_rgba(0,0,0,.38)]">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#080b09]/88 backdrop-blur-sm">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-white/[.1] bg-white/[.04]">
                <Camera className="size-8 text-primary" />
              </div>
              <p className="text-white font-semibold mb-4">Click start to enable camera</p>
              {cameraError && <p className="text-[#ef4444] text-sm mb-4 max-w-xs">{cameraError}</p>}
            </div>
          </div>
        )}

        {isActive && (
          <div className="absolute top-4 left-4 right-4 flex justify-between gap-2">
            <div className="glass px-3 py-2 rounded-xl min-w-[4.5rem]">
              <RepCounter count={repCount} />
              {isPlank && <p className="mt-0.5 text-center text-[10px] text-[#8f9a94]">holds</p>}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={feedback}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className={`glass px-3 py-2 rounded-xl border flex-1 flex items-center justify-center gap-2 text-center ${isGoodForm ? 'border-primary' : 'border-[#ef4444]'}`}
              >
                {isGoodForm
                  ? <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  : <AlertCircle className="size-4 shrink-0 text-destructive" />}
                <span className={`text-sm font-bold ${isGoodForm ? 'text-primary' : 'text-destructive'}`}>
                  {feedback}
                </span>
              </motion.div>
            </AnimatePresence>
            <div className="glass px-3 py-2 rounded-xl min-w-[4.5rem] text-center">
              <motion.div
                key={angle}
                initial={{ scale: 1.2, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-heading text-2xl font-black text-white"
              >
                {isPlank ? `${holdSeconds}s` : `${angle}°`}
              </motion.div>
              <FitnessBadge variant="sets" className="mt-0.5 border-0 bg-transparent px-0">
                {isPlank ? 'Hold time' : 'Angle'}
              </FitnessBadge>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 justify-center">
        {!isActive ? (
          <button onClick={startCamera} className="btn-accent inline-flex items-center gap-2 px-8 py-3 font-bold">
            <Camera className="size-4" /> Start Camera
          </button>
        ) : (
          <button onClick={stopCamera}
            className="inline-flex items-center gap-2 rounded-full border border-destructive px-8 py-3 font-bold text-destructive transition-all hover:bg-destructive/10">
            <Square className="size-4" /> Stop
          </button>
        )}
      </div>
    </div>
  )
}

/** Graded (non-binary) feedback for angle-threshold exercises (squat/push-up). */
function getGradedFeedback(currentAngle: number, ex: ExerciseDef, good: boolean): string {
  if (good) {
    const margin = ex.goodAngle - currentAngle
    return margin > 20 ? `${ex.goodFeedback} (deep rep)` : ex.goodFeedback
  }
  const delta = Math.round(currentAngle - ex.goodAngle)
  if (delta > 40) return `${ex.badFeedback} — you're only partway down (${Math.round(currentAngle)}°)`
  if (delta > 0) return `Almost there — ${delta}° more to go`
  return ex.badFeedback
}

/** Lunge-specific feedback using BOTH legs: front-leg depth + back-leg extension. */
function getLungeFeedback(leftAngle: number, rightAngle: number, ex: ExerciseDef, frontGood: boolean): string {
  const front = Math.min(leftAngle, rightAngle)
  const back = Math.max(leftAngle, rightAngle)
  const BACK_LEG_EXTENDED = 150 // best-estimate threshold, see EXERCISES.lunge.citation
  if (!frontGood) {
    return front > ex.goodAngle + 30 ? 'Step into a deeper lunge' : 'Almost — bend your front knee a little more'
  }
  if (back < BACK_LEG_EXTENDED) {
    return 'Extend your back leg further for a full lunge'
  }
  return ex.goodFeedback
}

/** Plank-specific feedback distinguishing hip sag vs. hip pike using the shoulder–hip–ankle line. */
function getPlankFeedback(
  currentAngle: number,
  ex: ExerciseDef,
  good: boolean,
  left: { a: { x: number; y: number }; b: { x: number; y: number }; c: { x: number; y: number } } | null,
  right: { a: { x: number; y: number }; b: { x: number; y: number }; c: { x: number; y: number } } | null,
): string {
  if (good) return ex.goodFeedback

  // Determine sag vs. pike from whichever side is visible: compare the hip's
  // actual y position to the y expected on a straight shoulder-ankle line.
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
