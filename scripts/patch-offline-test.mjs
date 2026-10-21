import fs from 'fs';
const p = 'scripts/test-form-checker-offline.ts';
let s = fs.readFileSync(p,'utf8');
const newBlock = `
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

const DEFAULT_NEW_VIDEOS: { file: string; exercise: ExerciseKey; manualReps: number }[] = Object.keys(
  VIDEO_EXERCISE_MAP,
).map((file) => ({ file, exercise: VIDEO_EXERCISE_MAP[file], manualReps: 0 }))

function discoverPatternVideos(root: string): string[] {
  if (!fs.existsSync(root)) return []
  return fs
    .readdirSync(root)
    .filter((name) => /\.mp4$/i.test(name) && /_\d+\.mp4$/i.test(name))
    .filter((name) => name in VIDEO_EXERCISE_MAP)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function parseVideosArg(argv: string[]): string[] | null {
  const eq = argv.find((a) => a.startsWith('--videos='))
  if (eq) return eq.slice('--videos='.length).split(',').map((s) => s.trim()).filter(Boolean)
  const idx = argv.indexOf('--videos')
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1].split(',').map((s) => s.trim()).filter(Boolean)
  return null
}

function resolveVideoList(argv: string[]): { file: string; exercise: ExerciseKey; manualReps: number }[] {
  const includeLegacy = argv.includes('--include-legacy')
  const discover = argv.includes('--discover')
  const fromArg = parseVideosArg(argv)

  let files: string[]
  if (fromArg) {
    files = fromArg
  } else if (discover) {
    files = discoverPatternVideos(ROOT)
  } else {
    files = DEFAULT_NEW_VIDEOS.map((v) => v.file)
  }

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
`;
const oldStart = s.indexOf('const VIDEOS:');
const oldEnd = s.indexOf('const SAMPLE_MS');
s = s.slice(0, oldStart) + newBlock + '\n' + s.slice(oldEnd);
s = s.replace(
  'const visualNotes: string[] = [',
  'const VIDEOS = resolveVideoList(process.argv)\n\n  const visualNotes: string[] = ['
);
s = s.replace(
  'Squats.mp4, Push_UP.mp4, Lunges.mp4, and Plank.mp4 are **real human** recordings at the repo root.',
  'Reference MP4s at the repo root (new batch; legacy via --include-legacy).'
);
fs.writeFileSync(p, s);
console.log('patched ok');
