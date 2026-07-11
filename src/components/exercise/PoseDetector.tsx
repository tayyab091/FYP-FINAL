'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

function calculateAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs(radians * 180 / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

const EXERCISES = {
  squat: {
    name: 'Squat',
    joints: [23, 25, 27],
    goodAngle: 100,
    repAngle: 160,
    goodFeedback: '✅ Great squat depth!',
    badFeedback: '⬇️ Go lower — bend knees more',
  },
  pushup: {
    name: 'Push-Up',
    joints: [11, 13, 15],
    goodAngle: 90,
    repAngle: 160,
    goodFeedback: '✅ Full range of motion!',
    badFeedback: '⬇️ Lower your chest more',
  },
  lunge: {
    name: 'Lunge',
    joints: [23, 25, 27],
    goodAngle: 100,
    repAngle: 160,
    goodFeedback: '✅ Perfect lunge depth!',
    badFeedback: '⬇️ Lower your back knee',
  },
  plank: {
    name: 'Plank',
    joints: [11, 23, 27],
    goodAngle: 160,
    repAngle: 0,
    goodFeedback: '✅ Perfect plank form!',
    badFeedback: '⬆️ Raise your hips — keep body straight',
  },
}

export function PoseDetector() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedExercise, setSelectedExercise] = useState<keyof typeof EXERCISES>('squat')
  const [repCount, setRepCount] = useState(0)
  const [feedback, setFeedback] = useState('Get in position to start')
  const [angle, setAngle] = useState(0)
  const [isGoodForm, setIsGoodForm] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const repStateRef = useRef<'up' | 'down'>('up')
  const poseRef = useRef<InstanceType<typeof import('@mediapipe/pose').Pose> | null>(null)
  const cameraRef = useRef<{ stop: () => void; start: () => Promise<void> } | null>(null)

  interface PoseResults {
    image: CanvasImageSource
    poseLandmarks?: Array<{ x: number; y: number; visibility?: number }>
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
    const [ai, bi, ci] = ex.joints

    const a = { x: lm[ai].x * canvas.width, y: lm[ai].y * canvas.height }
    const b = { x: lm[bi].x * canvas.width, y: lm[bi].y * canvas.height }
    const c = { x: lm[ci].x * canvas.width, y: lm[ci].y * canvas.height }

    const currentAngle = calculateAngle(a, b, c)
    setAngle(Math.round(currentAngle))

    const good = selectedExercise === 'plank'
      ? currentAngle >= ex.goodAngle
      : currentAngle <= ex.goodAngle

    setIsGoodForm(good)
    setFeedback(good ? ex.goodFeedback : ex.badFeedback)

    if (selectedExercise !== 'plank') {
      if (currentAngle <= ex.goodAngle && repStateRef.current === 'up') {
        repStateRef.current = 'down'
      } else if (currentAngle >= ex.repAngle && repStateRef.current === 'down') {
        repStateRef.current = 'up'
        setRepCount(c => c + 1)
      }
    }

    const POSE_CONNECTIONS = (window as Window & { POSE_CONNECTIONS?: [number, number][] }).POSE_CONNECTIONS
    if (POSE_CONNECTIONS) {
      ctx.strokeStyle = '#00ff87'
      ctx.lineWidth = 2
      POSE_CONNECTIONS.forEach(([s, e]) => {
        const start = lm[s], end = lm[e]
        if ((start.visibility ?? 0) > 0.5 && (end.visibility ?? 0) > 0.5) {
          ctx.beginPath()
          ctx.moveTo(start.x * canvas.width, start.y * canvas.height)
          ctx.lineTo(end.x * canvas.width, end.y * canvas.height)
          ctx.stroke()
        }
      })
    }

    lm.forEach((point) => {
      if ((point.visibility ?? 0) > 0.5) {
        ctx.fillStyle = '#00ff87'
        ctx.beginPath()
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    })

    ctx.fillStyle = 'white'
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText(`${Math.round(currentAngle)}°`, b.x + 10, b.y - 10)
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
    } catch {
      setCameraError('Camera access denied or not available. Allow camera permissions and refresh.')
    }
  }, [onResults])

  const stopCamera = useCallback(() => {
    cameraRef.current?.stop()
    setIsActive(false)
    setRepCount(0)
    setFeedback('Get in position to start')
  }, [])

  useEffect(() => { return () => { cameraRef.current?.stop() } }, [])

  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-wrap justify-center">
        {Object.entries(EXERCISES).map(([key, ex]) => (
          <button key={key}
            onClick={() => { setSelectedExercise(key as keyof typeof EXERCISES); setRepCount(0) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              selectedExercise === key
                ? 'bg-[#00ff87] text-black border-[#00ff87]'
                : 'bg-transparent text-[#a0a0a0] border-[#2a2a2a] hover:border-[#3a3a3a]'
            }`}>
            {ex.name}
          </button>
        ))}
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-[#111] aspect-video max-w-2xl mx-auto">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/80">
            <div className="text-center">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-white font-semibold mb-4">Click start to enable camera</p>
              {cameraError && <p className="text-[#ef4444] text-sm mb-4 max-w-xs">{cameraError}</p>}
            </div>
          </div>
        )}

        {isActive && (
          <div className="absolute top-4 left-4 right-4 flex justify-between gap-2">
            <div className="glass px-3 py-2 rounded-xl">
              <div className="text-2xl font-black text-white">{repCount}</div>
              <div className="text-[10px] text-[#a0a0a0] uppercase tracking-wider">Reps</div>
            </div>
            <div className={`glass px-3 py-2 rounded-xl border flex-1 text-center ${isGoodForm ? 'border-[#00ff87]' : 'border-[#ef4444]'}`}>
              <div className="text-sm font-bold" style={{ color: isGoodForm ? '#00ff87' : '#ef4444' }}>
                {feedback}
              </div>
            </div>
            <div className="glass px-3 py-2 rounded-xl">
              <div className="text-2xl font-black text-white">{angle}°</div>
              <div className="text-[10px] text-[#a0a0a0] uppercase tracking-wider">Angle</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 justify-center">
        {!isActive ? (
          <button onClick={startCamera} className="btn-accent px-8 py-3 font-bold">
            🎥 Start Camera
          </button>
        ) : (
          <button onClick={stopCamera}
            className="px-8 py-3 font-bold rounded-full border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
            ⏹ Stop
          </button>
        )}
      </div>
    </div>
  )
}
