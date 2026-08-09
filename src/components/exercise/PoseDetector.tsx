'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Square, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { RepCounter } from '@/components/motion/RepCounter'
import { FitnessBadge } from '@/components/motion/FitnessBadge'
import {
  EXERCISES,
  MIN_JOINT_VISIBILITY,
  createFormCheckerSession,
  processPoseFrame,
  type CameraQuality,
  type ExerciseKey,
  type FormCheckerSessionState,
  type LandmarkPoint,
  type ScoringState,
} from '@/lib/form-checker-pose'

export function PoseDetector() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseKey>('squat')
  const [repCount, setRepCount] = useState(0)
  const [feedback, setFeedback] = useState('Get in position to start')
  const [angle, setAngle] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [holdSeconds, setHoldSeconds] = useState(0)
  const [poseDetected, setPoseDetected] = useState(false)
  const [scoringState, setScoringState] = useState<ScoringState>('unscored')
  const [cameraQuality, setCameraQuality] = useState<CameraQuality>('step_back')
  const sessionStateRef = useRef<FormCheckerSessionState>(createFormCheckerSession())
  const sessionRepsRef = useRef(0)
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

    const processed = processPoseFrame(
      results.poseLandmarks,
      selectedExercise,
      canvas.width,
      canvas.height,
      performance.now(),
      sessionStateRef.current,
    )

    if (!processed.detected) {
      setPoseDetected(false)
      setScoringState('unscored')
      setCameraQuality(processed.cameraQuality)
      setFeedback(processed.feedback)
      return
    }

    setPoseDetected(true)
    setScoringState(processed.scoringState)
    setCameraQuality(processed.cameraQuality)

    const { angles } = processed
    const currentAngle = angles.currentAngle ?? 0
    const flexionAngle =
      angles.leftAngle !== null && angles.rightAngle !== null
        ? Math.min(angles.leftAngle, angles.rightAngle)
        : currentAngle
    const left = angles.left
    const right = angles.right
    const lm = results.poseLandmarks
    if (!lm) return

    setAngle(Math.round(flexionAngle))
    setFeedback(processed.feedback)

    if (selectedExercise === 'plank') {
      setHoldSeconds(processed.holdSeconds)
    }

    setRepCount(processed.repCount)
    sessionRepsRef.current = processed.repCount

    const POSE_CONNECTIONS = (window as Window & { POSE_CONNECTIONS?: [number, number][] }).POSE_CONNECTIONS
    if (POSE_CONNECTIONS) {
      ctx.strokeStyle = '#22f59a'
      ctx.lineWidth = 2
      POSE_CONNECTIONS.forEach(([s, e]) => {
        const start = lm[s], end = lm[e]
        if (!start || !end) return
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
    if (labelPoint) ctx.fillText(`${Math.round(flexionAngle)}°`, labelPoint.x + 10, labelPoint.y - 10)
  }, [selectedExercise])

  const onResultsRef = useRef(onResults)
  useEffect(() => {
    onResultsRef.current = onResults
  }, [onResults])

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
        minDetectionConfidence: 0.4,
        minTrackingConfidence: 0.4,
      })
      pose.onResults((results) => onResultsRef.current(results as PoseResults))
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
      sessionStateRef.current = createFormCheckerSession()
      sessionRepsRef.current = 0
    } catch (err) {
      console.error('Form checker camera error:', err)
      setCameraError('Camera access denied or not available. Allow camera permissions and refresh.')
    }
  }, [])

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
    sessionStateRef.current = createFormCheckerSession()
    sessionRepsRef.current = 0
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

  const cameraQualityLabel: Record<CameraQuality, string> = {
    side_ok: 'Side view OK',
    turn_90: 'Turn 90° — show your side',
    step_back: 'Step back so your full body is visible',
    unclear: 'Camera angle unclear',
  }

  const cameraQualityClass: Record<CameraQuality, string> = {
    side_ok: 'border-primary/40 bg-primary/10 text-primary',
    turn_90: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    step_back: 'border-destructive/40 bg-destructive/10 text-destructive',
    unclear: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  }

  function SideProfileDiagram() {
    return (
      <svg viewBox="0 0 200 160" className="mx-auto w-40 h-32" aria-hidden="true">
        <rect x="0" y="0" width="200" height="160" fill="none" />
        {/* camera */}
        <rect x="8" y="60" width="18" height="12" rx="2" fill="currentColor" className="text-muted-foreground" opacity="0.6" />
        <text x="4" y="52" fontSize="8" fill="currentColor" className="text-muted-foreground" opacity="0.7">camera</text>
        {/* person side profile */}
        <circle cx="120" cy="30" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
        <line x1="120" y1="40" x2="120" y2="80" stroke="currentColor" strokeWidth="2" className="text-primary" />
        <line x1="120" y1="50" x2="100" y2="70" stroke="currentColor" strokeWidth="2" className="text-primary" />
        <line x1="120" y1="50" x2="140" y2="65" stroke="currentColor" strokeWidth="2" className="text-primary" />
        <line x1="120" y1="80" x2="105" y2="120" stroke="currentColor" strokeWidth="2" className="text-primary" />
        <line x1="120" y1="80" x2="135" y2="120" stroke="currentColor" strokeWidth="2" className="text-primary" />
        {/* sight line */}
        <line x1="26" y1="66" x2="110" y2="66" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" className="text-muted-foreground" opacity="0.5" />
        <text x="60" y="155" fontSize="9" fill="currentColor" className="text-muted-foreground" opacity="0.8">Side profile · full body · good lighting</text>
      </svg>
    )
  }

  return (
    <div className="space-y-6">
      <div className="elite-panel flex flex-wrap justify-center gap-2 p-3">
        {Object.entries(EXERCISES).map(([key, ex]) => (
          <button key={key}
            onClick={() => {
              setSelectedExercise(key as ExerciseKey)
              setRepCount(0)
              sessionStateRef.current = createFormCheckerSession()
              sessionRepsRef.current = 0
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              selectedExercise === key
                ? 'bg-primary text-primary-foreground border-primary shadow-[0_8px_24px_rgba(34,245,154,.16)]'
                : 'bg-white/[.02] text-muted-foreground border-border hover:border-border hover:text-foreground'
            }`}>
            {ex.name}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground" title={EXERCISES[selectedExercise].citation}>
        Threshold source: {EXERCISES[selectedExercise].citation}
      </p>
      <p className="text-center text-xs text-primary/80 max-w-xl mx-auto">
        {selectedExercise === 'pushup' ? (
          <>
            <strong>Push-ups:</strong> place the laptop on the floor to your <strong>side</strong> (not in front),
            1–2 m away, so your shoulders, arms, and chest stay in frame.
          </>
        ) : (
          <>
            Camera tip: use a <strong>side profile</strong> for squats and lunges; place the camera at chest height for push-ups.
            Front-facing cameras often under-report depth and may miss reps.
          </>
        )}
      </p>

      <div className="relative rounded-3xl overflow-hidden bg-card aspect-video max-w-2xl mx-auto border border-border shadow-[0_30px_90px_rgba(0,0,0,.38)]">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="text-center max-w-sm px-4">
              <SideProfileDiagram />
              <p className="text-foreground font-semibold mt-2 mb-1">Camera setup</p>
              <p className="text-muted-foreground text-sm mb-4">
                {selectedExercise === 'pushup'
                  ? 'Place the laptop on the floor to your side, 1–2 m away, so shoulders, arms, and chest stay in frame.'
                  : 'Stand sideways to the camera with your full body visible. Face well-lit areas — avoid backlight.'}
              </p>
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
                className={`glass px-3 py-2 rounded-xl border flex-1 flex items-center justify-center gap-2 text-center ${
                  scoringState === 'good'
                    ? 'border-primary'
                    : scoringState === 'unscored'
                      ? 'border-amber-500/50'
                      : 'border-[#ef4444]'
                }`}
              >
                {scoringState === 'good'
                  ? <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  : scoringState === 'unscored'
                    ? <AlertCircle className="size-4 shrink-0 text-amber-400" />
                    : <AlertCircle className="size-4 shrink-0 text-destructive" />}
                <span
                  className={`text-sm font-bold ${
                    scoringState === 'good'
                      ? 'text-primary'
                      : scoringState === 'unscored'
                        ? 'text-amber-400'
                        : 'text-destructive'
                  }`}
                >
                  {feedback}
                </span>
              </motion.div>
            </AnimatePresence>
            <div className="glass px-3 py-2 rounded-xl min-w-[4.5rem] text-center">
              <motion.div
                key={angle}
                initial={{ scale: 1.2, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-heading text-2xl font-black text-foreground"
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

      {isActive && (
        <div className="flex flex-col items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cameraQualityClass[cameraQuality]}`}
          >
            <span
              className={`inline-block size-2 rounded-full ${
                cameraQuality === 'side_ok'
                  ? 'bg-primary shadow-[0_0_8px_rgba(34,245,154,.7)]'
                  : cameraQuality === 'step_back'
                    ? 'bg-destructive'
                    : 'bg-amber-400'
              }`}
            />
            {cameraQualityLabel[cameraQuality]}
          </span>
          <p className="text-center text-xs text-muted-foreground">
            <span
              className={`mr-1.5 inline-block size-2 rounded-full ${poseDetected ? 'bg-primary shadow-[0_0_8px_rgba(34,245,154,.7)]' : 'bg-[#ef4444]'}`}
            />
            {poseDetected ? 'Pose tracking active' : 'No pose — step back and show your full body'}
          </p>
        </div>
      )}
    </div>
  )
}
