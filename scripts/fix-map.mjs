import fs from 'fs';
const p = 'scripts/test-form-checker-offline.ts';
let s = fs.readFileSync(p, 'utf8');
const map = `
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
`;
const start = s.indexOf('const VIDEO_EXERCISE_MAP');
const end = s.indexOf('const LEGACY_VIDEOS');
s = s.slice(0, start) + map + '\n' + s.slice(end);
fs.writeFileSync(p, s);
console.log('map restored');
