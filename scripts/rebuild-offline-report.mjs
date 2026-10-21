import fs from 'fs';
import path from 'path';
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'scripts/form-checker-offline-output');
const videos = [
  ['Squat_1.mp4','squat'],['Squat_2.mp4','squat'],['Squat_3.mp4','squat'],['Squat_4.mp4','squat'],['Squat_5.mp4','squat'],['squats_5.mp4','squat'],
  ['Push_UPS_1.mp4','pushup'],['Push_UPS_2.mp4','pushup'],['Push_UPS_3.mp4','pushup'],['Push_UPS_4.mp4','pushup'],
  ['Lunges_1.mp4','lunge'],['Lunges_2.mp4','lunge'],['Lunges_3.mp4','lunge'],
  ['Plank_2.mp4','plank'],['Plank_3.mp4','plank'],['Plank_4.mp4','plank'],['Plank_5.mp4','plank'],['Planks_1.mp4','plank'],
];
function summary(file, exercise, manualReps, result) {
  const lines = [];
  const isPlank = exercise === 'plank';
  lines.push(`## ${file} (${exercise})`);
  lines.push(`- Duration/resolution: ${result.meta.duration.toFixed(2)}s ${result.meta.width}x${result.meta.height}`);
  lines.push(`- Pose detected: ${result.logs.length - result.dropouts}/${result.logs.length} (${((1 - result.dropoutRate) * 100).toFixed(0)}%)`);
  lines.push(`- Good-form frames: ${result.goodFrameCount}/${result.logs.length - result.dropouts}`);
  if (result.deepest) {
    const labelPeak = isPlank ? 'Best alignment' : 'Deepest';
    lines.push(`- ${labelPeak}: ${result.deepest.angle} deg @ ${result.deepest.timeSec}s -> ${result.deepest.good ? 'GOOD' : 'BAD'} - "${result.deepest.feedback}"`);
    lines.push(`- Bilateral at peak: L=${result.deepest.leftAngle} R=${result.deepest.rightAngle} (${result.deepest.bilateralMode})`);
  }
  if (isPlank) {
    const maxHold = Math.max(...result.logs.map((l) => l.holdSeconds ?? 0));
    lines.push(`- Hold credits: pipeline=${result.finalRepCount} (10s increments), max hold=${maxHold}s`);
  } else {
    lines.push(`- Reps: pipeline=${result.finalRepCount}, manual~${manualReps}`);
  }
  if (result.repEvents.length) {
    lines.push(`- Rep/hold events @ ${result.repEvents.map((r) => r.timeSec).join('s, ')}s`);
  }
  return lines.join('\n');
}
const summaries = [];
for (const [file, ex] of videos) {
  const p = path.join(OUT, file.replace('.mp4', '') + '-log.json');
  const result = JSON.parse(fs.readFileSync(p, 'utf8'));
  summaries.push(summary(file, ex, 0, result));
}
const reportPath = path.join(OUT, 'OFFLINE_TEST_REPORT.md');
const report = ['# Offline form-checker test report', `Generated: ${new Date().toISOString()}`, '', 'New videos batch (18 files).', '---', '', ...summaries].join('\n');
fs.writeFileSync(reportPath, report);
console.log('wrote', reportPath);
