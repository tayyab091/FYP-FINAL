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
  type ExerciseKey,
  type FormCheckerSessionState,
  type LandmarkPoint,
} from '@/lib/form-checker-pose'

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
      setFeedback(processed.feedback)
      return
    }

    const { angles } = processed
    const currentAngle = angles.currentAngle!
    const left = angles.left
    const right = angles.right
    const lm = results.poseLandmarks
    if (!lm) return

    setAngle(Math.round(currentAngle))
    setIsGoodForm(processed.good)
    setFeedback(processed.feedback)

    if (selectedExercise === 'plank') {
      setHoldSeconds(processed.holdSeconds)
    }

    if (processed.repCompletedThisFrame) {
      setRepCount(processed.repCount)
      sessionRepsRef.current = processed.repCount
    }

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
      sessionStateRef.current = createFormCheckerSession()
      sessionRepsRef.current = 0
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
