/**
 * Offline form-checker validation against local reference videos at repo root.
 * MediaPipe runs in Playwright/Chromium; angle/rep logic imported from src/lib/form-checker-pose.ts.
 */
import { chromium, type Browser, type Page } from '@playwright/test'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  EXERCISES,
  createFormCheckerSession,
  getFlexionAngle,
  processPoseFrame,
  type ExerciseKey,
} from '../src/lib/form-checker-pose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'scripts', 'form-checker-offline-output')
const FRAME_DIR = path.join(OUT_DIR, 'frames')



const VIDEO_EXERCISE_MAP: Record<string, ExerciseKey> = {
  'Squat_1.mp4': 'squat',
  'Squat_2.mp4': 'squat',
  'Squat_3.mp4': 'squat',
  'Squat_4.mp4': 'squat',
  'Squat_5.mp4': 'squat',
  'squats_5.mp4': 'squat',
  'Push_UPS_1.mp4': 'pushup',
  'Push_UPS_2.mp4': 'pushup',
  'Push_UPS_3.mp4': 'pushup',
  'Push_UPS_4.mp4': 'pushup',
  'Lunges_1.mp4': 'lunge',
  'Lunges_2.mp4': 'lunge',
  'Lunges_3.mp4': 'lunge',
  'Plank_2.mp4': 'plank',
  'Plank_3.mp4': 'plank',
  'Plank_4.mp4': 'plank',
  'Plank_5.mp4': 'plank',
  'Planks_1.mp4': 'plank',
}

const LEGACY_VIDEOS: { file: string; exercise: ExerciseKey; manualReps: number }[] = [
  { file: 'Squats.mp4', exercise: 'squat', manualReps: 3 },
  { file: 'Push_UP.mp4', exercise: 'pushup', manualReps: 3 },
  { file: 'Lunges.mp4', exercise: 'lunge', manualReps: 3 },
  { file: 'Plank.mp4', exercise: 'plank', manualReps: 0 },
]

const NEW_VIDEOS: { file: string; exercise: ExerciseKey; manualReps: number }[] = Object.keys(
  VIDEO_EXERCISE_MAP,
).map((file) => ({ file, exercise: VIDEO_EXERCISE_MAP[file], manualReps: 0 }))

function discoverPatternVideos(): string[] {
  return fs
    .readdirSync(ROOT)
    .filter((name) => /.mp4$/i.test(name) && /_d+.mp4$/i.test(name))
    .filter((name) => name in VIDEO_EXERCISE_MAP)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function parseVideosArg(argv: string[]): string[] | null {
  const eq = argv.find((a) => a.startsWith('--videos='))
  if (eq) return eq.slice('--videos='.length).split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
  const idx = argv.indexOf('--videos')
  if (idx >= 0) {
    const names: string[] = []
    for (let i = idx + 1; i < argv.length && !argv[i].startsWith('--'); i++) {
      names.push(...argv[i].split(/[,\s]+/).map((s) => s.trim()).filter(Boolean))
    }
    if (names.length) return names
  }
  return null
}

function resolveVideos(): { file: string; exercise: ExerciseKey; manualReps: number }[] {
  const argv = process.argv
  const fromArg = parseVideosArg(argv)
  const includeLegacy = argv.includes('--include-legacy')
  const discover = argv.includes('--discover')

  let files: string[]
  if (fromArg) files = fromArg
  else if (discover) files = discoverPatternVideos()
  else files = NEW_VIDEOS.map((v) => v.file)

  const list: { file: string; exercise: ExerciseKey; manualReps: number }[] = []
  for (const file of files) {
    const exercise = VIDEO_EXERCISE_MAP[file]
    if (!exercise) {
      console.error('Unknown video or missing exercise mapping: ' + file)
      process.exit(1)
    }
    list.push({ file, exercise, manualReps: 0 })
  }

  if (includeLegacy) {
    for (const v of LEGACY_VIDEOS) {
      if (!list.some((x) => x.file === v.file)) list.push(v)
    }
  }

  return list
}

const VIDEOS = resolveVideos()

const SAMPLE_MS = Number(process.env.FORM_CHECKER_SAMPLE_MS || '100')
const FRAME_SNAPSHOT_INTERVAL_SEC = Number(process.env.FORM_CHECKER_FRAME_INTERVAL_SEC || '0.5')

interface FrameLog {
  timeSec: number
  detected: boolean
  angle: number | null
  flexionAngle: number | null
  leftAngle: number | null
  rightAngle: number | null
  bilateralMode: string
  visibilityLeft: number[]
  visibilityRight: number[]
  good: boolean
  scoringState: string
  feedback: string
  repState: string
  repCount: number
  repCompleted: boolean
  holdSeconds?: number
  formAngle: number | null
  useDepthProxy: boolean
  peakAngleSpan: number
  cameraQuality: string
}

function startVideoServer(): Promise<{ port: number; close: () => void; baseUrl: string }> {
  return new Promise((resolve, reject) => {
    const playerHtml = fs.readFileSync(path.join(__dirname, 'form-checker-offline-player.html'), 'utf8')
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname === '/player.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(playerHtml)
        return
      }
      const name = decodeURIComponent(url.pathname.replace(/^\//, ''))
      const filePath = path.join(ROOT, name)
      if (!fs.existsSync(filePath)) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Access-Control-Allow-Origin': '*' })
      fs.createReadStream(filePath).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        reject(new Error('server bind failed'))
        return
      }
      resolve({
        port: addr.port,
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () => server.close(),
      })
    })
    server.on('error', reject)
  })
}

async function loadVideoMeta(page: Page, baseUrl: string, file: string) {
  const videoUrl = `${baseUrl}/${encodeURIComponent(file)}`
  const playerUrl = `${baseUrl}/player.html?src=${encodeURIComponent(videoUrl)}`
  await page.goto(playerUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForFunction(
    () => (window as unknown as { __videoReady?: { duration: number; width: number; height: number } }).__videoReady,
    { timeout: 30000 },
  )
  return page.evaluate(() => (window as unknown as { __videoReady: { duration: number; width: number; height: number } }).__videoReady)
}

async function extractSampleFrames(page: Page, baseUrl: string, file: string, label: string, duration: number) {
  const videoUrl = `${baseUrl}/${encodeURIComponent(file)}`
  const frameDir = path.join(FRAME_DIR, label)
  fs.mkdirSync(frameDir, { recursive: true })
  const times: number[] = []
  for (let t = 0; t <= duration; t += FRAME_SNAPSHOT_INTERVAL_SEC) times.push(Number(t.toFixed(2)))

  await page.goto(`${baseUrl}/player.html?src=${encodeURIComponent(videoUrl)}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (window as unknown as { __videoReady?: unknown }).__videoReady, { timeout: 30000 })

  for (const t of times) {
    await page.evaluate(async (sec) => {
      const v = document.getElementById('v') as HTMLVideoElement
      v.currentTime = sec
      await new Promise<void>((r) => v.addEventListener('seeked', () => r(), { once: true }))
    }, t)
    await page.locator('#v').screenshot({
      path: path.join(frameDir, `${label}_${String(t).replace('.', '_')}s.png`),
    })
  }

  return { frameDir, frameCount: times.length }
}

async function runVideoAnalysis(page: Page, baseUrl: string, file: string, exercise: ExerciseKey) {
  const videoUrl = `${baseUrl}/${encodeURIComponent(file)}`
  const playerUrl = `${baseUrl}/player.html?src=${encodeURIComponent(videoUrl)}`
  await page.goto(playerUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForFunction(() => (window as unknown as { __videoReady?: unknown }).__videoReady, { timeout: 30000 })

  await page.addScriptTag({
    url: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js',
  })
  await page.addScriptTag({ path: path.join(__dirname, 'form-checker-offline-mediapipe.js') })

  const setup = await page.evaluate(() => {
    return (window as unknown as { __initOfflinePoseOnPage: () => Promise<{ duration: number; width: number; height: number }> }).__initOfflinePoseOnPage()
  })

  const session = createFormCheckerSession()
  const logs: FrameLog[] = []
  let dropouts = 0

  const times: number[] = []
  for (let t = 0; t < setup.duration; t += SAMPLE_MS / 1000) {
    times.push(Number(t.toFixed(2)))
  }

  for (const timeSec of times) {
    const landmarks = (await page.evaluate((sec) => {
      return (window as unknown as { __detectPoseAt: (s: number) => Promise<unknown> }).__detectPoseAt(sec)
    }, timeSec)) as { x: number; y: number; visibility?: number }[] | null

    const processed = processPoseFrame(
      landmarks ?? undefined,
      exercise,
      setup.width || 640,
      setup.height || 480,
      timeSec * 1000,
      session,
    )

    if (!processed.detected) dropouts++

    const flexion =
      processed.detected && processed.angles.currentAngle !== null
        ? getFlexionAngle(processed.angles)
        : null

    logs.push({
      timeSec,
      detected: processed.detected,
      angle: processed.angles.currentAngle !== null ? Math.round(processed.angles.currentAngle) : null,
      flexionAngle: flexion !== null ? Math.round(flexion) : null,
      leftAngle: processed.angles.leftAngle !== null ? Math.round(processed.angles.leftAngle) : null,
      rightAngle: processed.angles.rightAngle !== null ? Math.round(processed.angles.rightAngle) : null,
      bilateralMode: processed.angles.bilateralMode,
      visibilityLeft: processed.angles.visibility.left.map((v) => Number(v.toFixed(2))),
      visibilityRight: processed.angles.visibility.right.map((v) => Number(v.toFixed(2))),
      good: processed.good,
      scoringState: processed.scoringState,
      feedback: processed.feedback,
      repState: processed.repState,
      repCount: processed.repCount,
      repCompleted: processed.repCompletedThisFrame,
      holdSeconds: processed.holdSeconds,
      formAngle: processed.detected ? Math.round(processed.formAngle) : null,
      useDepthProxy: processed.useDepthProxy,
      peakAngleSpan: processed.peakAngleSpan,
      cameraQuality: processed.cameraQuality,
    })
  }

  const detectedFrames = logs.filter((l) => l.detected && l.formAngle !== null)
  const ex = EXERCISES[exercise]
  const isPlank = exercise === 'plank'
  const peakForm = detectedFrames.reduce<FrameLog | null>((best, f) => {
    if (f.formAngle === null) return best
    if (!best || best.formAngle === null) return f
    if (isPlank) return f.formAngle > best.formAngle ? f : best
    return f.formAngle < best.formAngle ? f : best
  }, null)
  const depthFrames = detectedFrames.filter((l) => {
    if (l.angle === null) return false
    return isPlank ? l.angle >= ex.goodAngle - 15 : l.angle <= ex.goodAngle + 15
  })
  const goodFrames = detectedFrames.filter((l) => l.scoringState === 'good')
  const unscoredFrames = detectedFrames.filter((l) => l.scoringState === 'unscored')

  const flexionAngles = detectedFrames
    .map((l) => l.flexionAngle)
    .filter((a): a is number => a !== null)
  const avgAngles = detectedFrames.map((l) => l.angle).filter((a): a is number => a !== null)
  const flexionSpan =
    flexionAngles.length > 0 ? Math.max(...flexionAngles) - Math.min(...flexionAngles) : 0
  const avgSpan = avgAngles.length > 0 ? Math.max(...avgAngles) - Math.min(...avgAngles) : 0

  return {
    meta: setup,
    logs,
    dropouts,
    dropoutRate: dropouts / logs.length,
    deepest: peakForm,
    depthFrames,
    goodFrames,
    goodFrameCount: goodFrames.length,
    unscoredFrameCount: unscoredFrames.length,
    repEvents: logs.filter((l) => l.repCompleted),
    finalRepCount: session.repCount,
    threshold: ex.goodAngle,
    exercise,
  }
}

async function main() {
  const framesOnly = process.argv.includes('--frames-only')
  const analyzeOnly = process.argv.includes('--analyze-only')
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const server = await startVideoServer()
  const browser = await chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required'],
  })

  const visualNotes: string[] = [
    '# Visual sanity — real human reference footage',
    '',
    'Reference MP4s at the repo root (new batch; legacy via --include-legacy).',
    'Inspect PNGs under `scripts/form-checker-offline-output/frames/`.',
    '',
  ]

  try {
    if (!analyzeOnly) {
      const framePage = await browser.newPage()
      for (const v of VIDEOS) {
        const videoPath = path.join(ROOT, v.file)
        if (!fs.existsSync(videoPath)) {
          console.error(`Missing ${videoPath}`)
          process.exit(1)
        }
        console.log(`Loading ${v.file}...`)
        const meta = await loadVideoMeta(framePage, server.baseUrl, v.file)
        console.log(`  duration=${meta.duration.toFixed(1)}s ${meta.width}x${meta.height}`)
        console.log(`  extracting frames...`)
        const { frameDir, frameCount } = await extractSampleFrames(
          framePage,
          server.baseUrl,
          v.file,
          v.file.replace('.mp4', ''),
          meta.duration,
        )
        visualNotes.push(`- ${v.file}: ${frameCount} frames → \`${path.relative(ROOT, frameDir)}\``)
      }
      await framePage.close()
      fs.writeFileSync(path.join(OUT_DIR, 'VISUAL_SANITY.md'), visualNotes.join('\n'))
      if (framesOnly) {
        console.log('Frame extraction complete.')
        return
      }
    }

    const summaries: string[] = []
    for (const v of VIDEOS) {
      const analysisPage = await browser.newPage()
      console.log(`Analyzing ${v.file} (${v.exercise})...`)
      try {
        const result = await runVideoAnalysis(analysisPage, server.baseUrl, v.file, v.exercise)
        summaries.push(formatSummary(v.file, v.exercise, v.manualReps, result))
        fs.writeFileSync(
          path.join(OUT_DIR, `${v.file.replace('.mp4', '')}-log.json`),
          JSON.stringify(result, null, 2),
        )
      } finally {
        await analysisPage.close()
      }
    }

    const reportPath = path.join(OUT_DIR, 'OFFLINE_TEST_REPORT.md')
    fs.writeFileSync(
      reportPath,
      [`# Offline form-checker test report`, `Generated: ${new Date().toISOString()}`, '', ...visualNotes, '---', '', ...summaries].join('\n'),
    )
    console.log(`\nWrote ${reportPath}`)
    console.log(summaries.join('\n\n'))
  } finally {
    await browser.close()
    server.close()
  }
}

function formatSummary(
  label: string,
  exercise: ExerciseKey,
  manualReps: number,
  result: Awaited<ReturnType<typeof runVideoAnalysis>>,
) {
  const lines: string[] = []
  const isPlank = exercise === 'plank'
  lines.push(`## ${label} (${exercise})`)
  lines.push(`- Pose detected: ${result.logs.length - result.dropouts}/${result.logs.length} (${((1 - result.dropoutRate) * 100).toFixed(0)}%)`)
  lines.push(`- Good-form frames: ${result.goodFrameCount}/${result.logs.length - result.dropouts}`)
  lines.push(`- Unscored frames: ${result.unscoredFrameCount}/${result.logs.length - result.dropouts}`)
  if (result.deepest) {
    const cmp = isPlank ? `≥${result.threshold}°` : `≤${result.threshold}°`
    const labelPeak = isPlank ? 'Best alignment' : 'Deepest'
    const verdict =
      result.deepest.scoringState === 'good'
        ? 'PASS'
        : result.deepest.scoringState === 'unscored'
          ? 'UNSCORED'
          : 'FAIL'
    lines.push(
      `- ${labelPeak}: ${result.deepest.formAngle}° @ ${result.deepest.timeSec}s (${cmp}) → ${verdict} — "${result.deepest.feedback}"`,
    )
    if (result.deepest.useDepthProxy) {
      lines.push(`- Depth-proxy active (raw 2D angle ${result.deepest.angle}°)`)
    }
    lines.push(`- Bilateral at peak: L=${result.deepest.leftAngle}° R=${result.deepest.rightAngle}° (${result.deepest.bilateralMode})`)
  }
  if (isPlank) {
    const maxHold = Math.max(...result.logs.map((l) => l.holdSeconds ?? 0))
    lines.push(`- Hold credits: pipeline=${result.finalRepCount} (10s increments), max hold=${maxHold}s`)
  } else {
    lines.push(`- Reps: pipeline=${result.finalRepCount}, manual≈${manualReps}`)
  }
  if (result.repEvents.length) {
    lines.push(`- Rep/hold events @ ${result.repEvents.map((r) => r.timeSec).join('s, ')}s`)
  }
  return lines.join('\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
