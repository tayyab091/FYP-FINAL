import fs from 'fs';
const p = 'scripts/test-form-checker-offline.ts';
let s = fs.readFileSync(p, 'utf8');
const cut = s.indexOf('main().catch((err) => {');
if (cut < 0) throw new Error('main.catch not found');
const end = s.indexOf('\n})', cut);
if (end < 0) throw new Error('end not found');
s = s.slice(0, end + 3) + '\n';
s = s.replace(/\n  const VIDEOS = resolveVideoList\(process\.argv\)\n\n/, '\n');
const blockStart = s.indexOf('const DEFAULT_VIDEOS:');
const blockEnd = s.indexOf('const SAMPLE_MS');
const newTop = `
const VIDEO_EXERCISE_MAP: Record<string, ExerciseKey> = {
  Squat_1.mp4: 'squat',
  Squat_2.mp4: 'squat',
  Squat_3.mp4: 'squat',
  Squat_4.mp4: 'squat',
  Squat_5.mp4: 'squat',
  squats_5.mp4: 'squat',
  Push_UPS_1.mp4: 'pushup',
  Push_UPS_2.mp4: 'pushup',
  Push_UPS_3.mp4: 'pushup',
  Push_UPS_4.mp4: 'pushup',
  Lunges_1.mp4: 'lunge',
  Lunges_2.mp4: 'lunge',
  Lunges_3.mp4: 'lunge',
  Plank_2.mp4: 'plank',
  Plank_3.mp4: 'plank',
  Plank_4.mp4: 'plank',
  Plank_5.mp4: 'plank',
  Planks_1.mp4: 'plank',
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
    .filter((name) => /\.mp4$/i.test(name) && /_\d+\.mp4$/i.test(name))
    .filter((name) => name in VIDEO_EXERCISE_MAP)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function parseVideosArg(argv: string[]): string[] | null {
  const eq = argv.find((a) => a.startsWith('--videos='))
  if (eq) return eq.slice('--videos='.length).split(',').map((s) => s.trim()).filter(Boolean)
  const idx = argv.indexOf('--videos')
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) {
    return argv[idx + 1].split(',').map((s) => s.trim()).filter(Boolean)
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

`;
if (blockStart < 0 || blockEnd < 0) throw new Error('block markers missing');
s = s.slice(0, blockStart) + newTop + s.slice(blockEnd);
fs.writeFileSync(p, s);
console.log('fixed, lines', s.split('\n').length);
