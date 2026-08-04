/**
 * Offline form-checker validation against local reference videos (Squats.mp4, Push_UP.mp4).
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
  processPoseFrame,
  type ExerciseKey,
} from '../src/lib/form-checker-pose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'scripts', 'form-checker-offline-output')
const FRAME_DIR = path.join(OUT_DIR, 'frames')

const VIDEOS: { file: string; exercise: ExerciseKey; manualReps: number }[] = [
  { file: 'Squats.mp4', exercise: 'squat', manualReps: 3 },
  { file: 'Push_UP.mp4', exercise: 'pushup', manualReps: 3 },
]

const SAMPLE_MS = 200

interface FrameLog {
  timeSec: number
  detected: boolean
  angle: number | null
  leftAngle: number | null
  rightAngle: number | null
  bilateralMode: string
  visibilityLeft: number[]
  visibilityRight: number[]
  good: boolean
  feedback: string
  repState: string
  repCount: number
  repCompleted: boolean
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
  for (let t = 0; t <= duration; t += 1.5) times.push(Number(t.toFixed(2)))

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

    logs.push({
      timeSec,
      detected: processed.detected,
      angle: processed.angles.currentAngle !== null ? Math.round(processed.angles.currentAngle) : null,
      leftAngle: processed.angles.leftAngle !== null ? Math.round(processed.angles.leftAngle) : null,
      rightAngle: processed.angles.rightAngle !== null ? Math.round(processed.angles.rightAngle) : null,
      bilateralMode: processed.angles.bilateralMode,
      visibilityLeft: processed.angles.visibility.left.map((v) => Number(v.toFixed(2))),
      visibilityRight: processed.angles.visibility.right.map((v) => Number(v.toFixed(2))),
      good: processed.good,
      feedback: processed.feedback,
      repState: processed.repState,
      repCount: processed.repCount,
      repCompleted: processed.repCompletedThisFrame,
    })
  }

  const detectedFrames = logs.filter((l) => l.detected && l.angle !== null)
  const ex = EXERCISES[exercise]
  const deepest = detectedFrames.reduce<FrameLog | null>((best, f) => {
    if (f.angle === null) return best
    if (!best || best.angle === null || f.angle < best.angle) return f
    return best
  }, null)
  const depthFrames = detectedFrames.filter((l) => l.angle !== null && l.angle <= ex.goodAngle + 15)

  return {
    meta: setup,
    logs,
    dropouts,
    dropoutRate: dropouts / logs.length,
    deepest,
    depthFrames,
    repEvents: logs.filter((l) => l.repCompleted),
    finalRepCount: session.repCount,
    threshold: ex.goodAngle,
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
    '# Visual sanity — AI-generated reference footage (Gemini/Veo)',
    '',
    'Squats.mp4 and Push_UP.mp4 are **synthetic**, not real human video.',
    'Inspect PNGs under `scripts/form-checker-offline-output/frames/`.',
    '',
    '### Squats.mp4 (manual frame review)',
    '- Side-profile studio shot; full body in frame (head to feet).',
    '- Anatomically plausible in sampled frames; smooth AI skin texture.',
    '- Plain white wall, even lighting — good contrast for pose detection.',
    '- Arms extended forward; side view may occlude far-side joints (tests unilateral fallback).',
    '',
    '### Push_UP.mp4 (manual frame review)',
    '- Full body visible; gym mat + white wall background.',
    '- Some frames show motion blur on moving leg (AI artifact) — may lower landmark confidence.',
    '- Clip includes high-plank / leg-tuck style motion, not only classic push-up bottom positions.',
    '- Veo sparkle watermark bottom-right (synthetic footage marker).',
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
  lines.push(`## ${label} (${exercise})`)
  lines.push(`- Pose detected: ${result.logs.length - result.dropouts}/${result.logs.length} (${((1 - result.dropoutRate) * 100).toFixed(0)}%)`)
  if (result.deepest) {
    lines.push(
      `- Deepest: ${result.deepest.angle}° @ ${result.deepest.timeSec}s (≤${result.threshold}°) → ${result.deepest.good ? 'GOOD' : 'BAD'} — "${result.deepest.feedback}"`,
    )
    lines.push(`- Bilateral at deepest: L=${result.deepest.leftAngle}° R=${result.deepest.rightAngle}° (${result.deepest.bilateralMode})`)
  }
  lines.push(`- Reps: pipeline=${result.finalRepCount}, manual≈${manualReps}`)
  if (result.repEvents.length) {
    lines.push(`- Rep events @ ${result.repEvents.map((r) => r.timeSec).join('s, ')}s`)
  }
  return lines.join('\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
