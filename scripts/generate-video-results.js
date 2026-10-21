const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const dir = path.join(ROOT, 'scripts', 'form-checker-offline-output')

const VIDEOS = [
  { file: 'Squat_1.mp4', ex: 'squat' },
  { file: 'Squat_2.mp4', ex: 'squat' },
  { file: 'Squat_3.mp4', ex: 'squat' },
  { file: 'Squat_4.mp4', ex: 'squat' },
  { file: 'Squat_5.mp4', ex: 'squat' },
  { file: 'squats_5.mp4', ex: 'squat' },
  { file: 'Push_UPS_1.mp4', ex: 'pushup' },
  { file: 'Push_UPS_2.mp4', ex: 'pushup' },
  { file: 'Push_UPS_3.mp4', ex: 'pushup' },
  { file: 'Push_UPS_4.mp4', ex: 'pushup' },
  { file: 'Lunges_1.mp4', ex: 'lunge' },
  { file: 'Lunges_2.mp4', ex: 'lunge' },
  { file: 'Lunges_3.mp4', ex: 'lunge' },
  { file: 'Plank_2.mp4', ex: 'plank' },
  { file: 'Plank_3.mp4', ex: 'plank' },
  { file: 'Plank_4.mp4', ex: 'plank' },
  { file: 'Plank_5.mp4', ex: 'plank' },
  { file: 'Planks_1.mp4', ex: 'plank' },
]

const rows = []
for (const v of VIDEOS) {
  const base = v.file.replace('.mp4', '')
  const p = path.join(dir, `${base}-log.json`)
  if (!fs.existsSync(p)) {
    rows.push({ ...v, status: 'MISSING LOG' })
    continue
  }
  const d = JSON.parse(fs.readFileSync(p, 'utf8'))
  const logs = d.logs.filter((l) => l.detected)
  const good = logs.filter((l) => l.scoringState === 'good')
  const unscored = logs.filter((l) => l.scoringState === 'unscored')
  const fa = logs.map((l) => l.formAngle).filter((x) => x != null)
  const isPlank = v.ex === 'plank'
  const peak = logs.reduce((b, l) => {
    if (l.formAngle == null) return b
    if (!b) return l
    return isPlank ? (l.formAngle > b.formAngle ? l : b) : l.formAngle < b.formAngle ? l : b
  }, null)
  const repEvents = logs.filter((l) => l.repCompleted).map((l) => `${l.timeSec}s`)
  const maxHold = Math.max(0, ...logs.map((l) => l.holdSeconds || 0))
  const proxyFrames = logs.filter((l) => l.useDepthProxy).length
  const verdict =
    peak
      ? peak.scoringState === 'good'
        ? 'PASS'
        : peak.scoringState === 'unscored'
          ? 'UNSCORED'
          : 'FAIL'
      : 'FAIL'
  rows.push({
    file: v.file,
    exercise: v.ex,
    duration: `${d.meta.duration?.toFixed(1)}s`,
    resolution: `${d.meta.width || '?'}x${d.meta.height || '?'}`,
    poseDetect: `${logs.length}/${d.logs.length}`,
    goodFrames: `${good.length}/${logs.length}`,
    formAngleMin: fa.length ? Math.min(...fa) : null,
    formAngleMax: fa.length ? Math.max(...fa) : null,
    peakAngle: peak ? peak.formAngle : null,
    peakTime: peak ? peak.timeSec : null,
    peakRaw2D: peak ? peak.angle : null,
    verdict,
    scoringState: peak ? peak.scoringState : 'unscored',
    unscoredFrames: unscored.length,
    feedback: peak ? peak.feedback : '',
    reps: d.finalRepCount,
    repEvents,
    maxHold,
    depthProxy: proxyFrames > 0,
    proxyFrames,
  })
}

const lines = []
lines.push('# Form Checker — Individual Video Results')
lines.push('')
lines.push(`Generated: ${new Date().toISOString()}`)
lines.push('')
lines.push(
  'All **18** exercise videos at the repo root were analyzed using the offline harness (`npm run test-form-checker-analyze-new`): Playwright + MediaPipe Pose + `src/lib/form-checker-pose.ts`.',
)
lines.push('')
lines.push(
  '| # | Video | Exercise | Duration | Resolution | Pose detect | Good frames | Form angle (min–max) | Peak | Verdict | Reps | Notes |',
)
lines.push(
  '|---|-------|----------|----------|------------|-------------|-------------|----------------------|------|---------|------|-------|',
)

rows.forEach((r, i) => {
  const peak = r.peakAngle != null ? `${r.peakAngle}° @ ${r.peakTime}s` : 'n/a'
  const ang = r.formAngleMin != null ? `${r.formAngleMin}–${r.formAngleMax}°` : 'n/a'
  const notes = []
  if (r.depthProxy) notes.push(`depth-proxy ${r.proxyFrames} frames`)
  if (r.peakRaw2D != null && r.depthProxy) notes.push(`raw 2D ${r.peakRaw2D}°`)
  if (r.exercise === 'plank') notes.push(`max hold ${r.maxHold}s`)
  if (r.repEvents.length) notes.push(`events @ ${r.repEvents.join(', ')}`)
  lines.push(
    `| ${i + 1} | ${r.file} | ${r.exercise} | ${r.duration} | ${r.resolution} | ${r.poseDetect} | ${r.goodFrames} | ${ang} | ${peak} | **${r.verdict}** | ${r.reps} | ${notes.join('; ')} |`,
  )
})

const pass = rows.filter((r) => r.verdict === 'PASS').length
const unscored = rows.filter((r) => r.verdict === 'UNSCORED').length
const fail = rows.filter((r) => r.verdict === 'FAIL').length
lines.push('')
lines.push('## Summary')
lines.push('')
lines.push(`- **Videos examined:** ${rows.filter((r) => r.status !== 'MISSING LOG').length} / 18`)
lines.push(`- **Overall pass (form at peak):** ${pass} / 18`)
lines.push(`- **Unscored (camera angle unclear):** ${unscored} / 18`)
lines.push(`- **Fail:** ${fail} / 18`)
lines.push(`- **Squats:** ${rows.filter((r) => r.exercise === 'squat' && r.verdict === 'PASS').length} / 6 pass`)
lines.push(`- **Push-ups:** ${rows.filter((r) => r.exercise === 'pushup' && r.verdict === 'PASS').length} / 4 pass`)
lines.push(`- **Lunges:** ${rows.filter((r) => r.exercise === 'lunge' && r.verdict === 'PASS').length} / 3 pass`)
lines.push(`- **Planks:** ${rows.filter((r) => r.exercise === 'plank' && r.verdict === 'PASS').length} / 5 pass`)
lines.push('')
lines.push('## Thresholds')
lines.push('')
lines.push('| Exercise | Good form threshold |')
lines.push('|----------|---------------------|')
lines.push('| Squat | Knee angle ≤ 100° |')
lines.push('| Push-up | Elbow angle ≤ 90° |')
lines.push('| Lunge | Front knee ≤ 100° |')
lines.push('| Plank | Body alignment ≥ 160° |')
lines.push('')
lines.push('## Per-video detail')
lines.push('')

for (const r of rows) {
  lines.push(`### ${r.file} (${r.exercise})`)
  lines.push('')
  if (r.status === 'MISSING LOG') {
    lines.push('**ERROR:** Log file missing.')
    lines.push('')
    continue
  }
  lines.push(`- **Duration / resolution:** ${r.duration}, ${r.resolution}`)
  lines.push(`- **Pose detection:** ${r.poseDetect}`)
  lines.push(`- **Good-form frames:** ${r.goodFrames}`)
  if (r.unscoredFrames > 0) lines.push(`- **Unscored frames:** ${r.unscoredFrames}/${r.poseDetect.split('/')[0]}`)
  lines.push(`- **Form angle range:** ${r.formAngleMin}° – ${r.formAngleMax}°`)
  lines.push(`- **Peak form:** ${r.peakAngle}° @ ${r.peakTime}s → **${r.verdict}**`)
  if (r.depthProxy) {
    lines.push(`- **Depth proxy:** active (${r.proxyFrames} frames); raw 2D at peak: ${r.peakRaw2D}°`)
  }
  lines.push(`- **Feedback at peak:** "${r.feedback}"`)
  if (r.exercise === 'plank') {
    lines.push(`- **Hold credits:** ${r.reps} (10s increments); max continuous hold: ${r.maxHold}s`)
  } else {
    lines.push(`- **Reps counted:** ${r.reps}${r.repEvents.length ? ` @ ${r.repEvents.join(', ')}` : ''}`)
  }
  lines.push(`- **Frame log:** \`scripts/form-checker-offline-output/${r.file.replace('.mp4', '')}-log.json\``)
  lines.push('')
}

const out = path.join(ROOT, 'FORM_CHECKER_VIDEO_RESULTS.md')
fs.writeFileSync(out, lines.join('\n'))
console.log(`Wrote ${out}`)
console.log(`Pass: ${pass} / 18`)
