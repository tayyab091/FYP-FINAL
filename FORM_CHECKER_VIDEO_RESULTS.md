# Form Checker — Individual Video Results

Generated: 2026-08-08T20:21:55.862Z

All **18** exercise videos at the repo root were analyzed using the offline harness (`npm run test-form-checker-analyze-new`): Playwright + MediaPipe Pose + `src/lib/form-checker-pose.ts`.

| # | Video | Exercise | Duration | Resolution | Pose detect | Good frames | Form angle (min–max) | Peak | Verdict | Reps | Notes |
|---|-------|----------|----------|------------|-------------|-------------|----------------------|------|---------|------|-------|
| 1 | Squat_1.mp4 | squat | 27.2s | 2160x4096 | 137/137 | 0/137 | 100–100° | 100° @ 0s | **UNSCORED** | 0 | depth-proxy 137 frames; raw 2D 179° |
| 2 | Squat_2.mp4 | squat | 10.0s | 2160x3840 | 51/51 | 0/51 | 100–102° | 100° @ 0s | **UNSCORED** | 0 | depth-proxy 51 frames; raw 2D 172° |
| 3 | Squat_3.mp4 | squat | 10.4s | 2160x4096 | 53/53 | 15/53 | 81–84° | 81° @ 0s | **PASS** | 0 |  |
| 4 | Squat_4.mp4 | squat | 28.0s | 2160x3840 | 141/141 | 0/141 | 100–102° | 100° @ 0s | **UNSCORED** | 0 | depth-proxy 141 frames; raw 2D 179° |
| 5 | Squat_5.mp4 | squat | 15.8s | 1080x1920 | 80/80 | 0/80 | 100–102° | 100° @ 0s | **UNSCORED** | 0 | depth-proxy 80 frames; raw 2D 170° |
| 6 | squats_5.mp4 | squat | 12.7s | 2160x3840 | 64/64 | 0/64 | 100–101° | 100° @ 0s | **UNSCORED** | 0 | depth-proxy 64 frames; raw 2D 175° |
| 7 | Push_UPS_1.mp4 | pushup | 18.5s | 4096x2160 | 93/93 | 0/93 | 90–164° | 90° @ 0s | **UNSCORED** | 1 | depth-proxy 93 frames; raw 2D 168°; events @ 0.4s |
| 8 | Push_UPS_2.mp4 | pushup | 10.0s | 2160x3840 | 51/51 | 0/51 | 90–170° | 90° @ 0s | **UNSCORED** | 1 | depth-proxy 51 frames; raw 2D 169°; events @ 0.4s |
| 9 | Push_UPS_3.mp4 | pushup | 7.4s | 4096x1680 | 37/37 | 0/37 | 90–139° | 90° @ 0s | **UNSCORED** | 1 | depth-proxy 37 frames; raw 2D 136°; events @ 0.4s |
| 10 | Push_UPS_4.mp4 | pushup | 21.7s | 1920x1080 | 109/109 | 0/109 | 90–159° | 90° @ 0s | **UNSCORED** | 1 | depth-proxy 109 frames; raw 2D 167°; events @ 0.4s |
| 11 | Lunges_1.mp4 | lunge | 45.4s | 2160x4096 | 227/227 | 0/227 | 104–128° | 104° @ 0s | **UNSCORED** | 0 |  |
| 12 | Lunges_2.mp4 | lunge | 11.9s | 720x1280 | 60/60 | 0/60 | 150–152° | 150° @ 0.2s | **UNSCORED** | 1 | events @ 0.8s |
| 13 | Lunges_3.mp4 | lunge | 11.1s | 3840x2160 | 56/56 | 6/56 | 99–103° | 99° @ 2.4s | **PASS** | 0 |  |
| 14 | Plank_2.mp4 | plank | 20.3s | 2160x4096 | 102/102 | 0/102 | 99–151° | 151° @ 15.8s | **FAIL** | 0 | max hold 0s |
| 15 | Plank_3.mp4 | plank | 9.4s | 3840x2160 | 47/47 | 47/47 | 175–178° | 178° @ 3.2s | **PASS** | 0 | max hold 9s |
| 16 | Plank_4.mp4 | plank | 9.0s | 4096x1728 | 45/45 | 45/45 | 166–169° | 169° @ 0s | **PASS** | 0 | max hold 8s |
| 17 | Plank_5.mp4 | plank | 12.3s | 1920x1080 | 62/62 | 62/62 | 176–178° | 178° @ 0.2s | **PASS** | 1 | max hold 12s; events @ 10s |
| 18 | Planks_1.mp4 | plank | 27.5s | 4096x2160 | 138/138 | 137/138 | 157–172° | 172° @ 17s | **PASS** | 2 | max hold 26s; events @ 10.8s, 20.8s |

## Summary

- **Videos examined:** 18 / 18
- **Overall pass (form at peak):** 6 / 18
- **Unscored (camera angle unclear):** 11 / 18
- **Fail:** 1 / 18
- **Squats:** 1 / 6 pass
- **Push-ups:** 0 / 4 pass
- **Lunges:** 1 / 3 pass
- **Planks:** 4 / 5 pass

## Thresholds

| Exercise | Good form threshold |
|----------|---------------------|
| Squat | Knee angle ≤ 100° |
| Push-up | Elbow angle ≤ 90° |
| Lunge | Front knee ≤ 100° |
| Plank | Body alignment ≥ 160° |

## Per-video detail

### Squat_1.mp4 (squat)

- **Duration / resolution:** 27.2s, 2160x4096
- **Pose detection:** 137/137
- **Good-form frames:** 0/137
- **Unscored frames:** 137/137
- **Form angle range:** 100° – 100°
- **Peak form:** 100° @ 0s → **UNSCORED**
- **Depth proxy:** active (137 frames); raw 2D at peak: 179°
- **Feedback at peak:** "Cannot score — camera angle unclear. Turn so your side faces the camera."
- **Reps counted:** 0
- **Frame log:** `scripts/form-checker-offline-output/Squat_1-log.json`

### Squat_2.mp4 (squat)

- **Duration / resolution:** 10.0s, 2160x3840
- **Pose detection:** 51/51
- **Good-form frames:** 0/51
- **Unscored frames:** 51/51
- **Form angle range:** 100° – 102°
- **Peak form:** 100° @ 0s → **UNSCORED**
- **Depth proxy:** active (51 frames); raw 2D at peak: 172°
- **Feedback at peak:** "Cannot score — camera angle unclear. Turn so your side faces the camera."
- **Reps counted:** 0
- **Frame log:** `scripts/form-checker-offline-output/Squat_2-log.json`

### Squat_3.mp4 (squat)

- **Duration / resolution:** 10.4s, 2160x4096
- **Pose detection:** 53/53
- **Good-form frames:** 15/53
- **Unscored frames:** 38/53
- **Form angle range:** 81° – 84°
- **Peak form:** 81° @ 0s → **PASS**
- **Feedback at peak:** "Great squat depth!"
- **Reps counted:** 0
- **Frame log:** `scripts/form-checker-offline-output/Squat_3-log.json`

### Squat_4.mp4 (squat)

- **Duration / resolution:** 28.0s, 2160x3840
- **Pose detection:** 141/141
- **Good-form frames:** 0/141
- **Unscored frames:** 141/141
- **Form angle range:** 100° – 102°
- **Peak form:** 100° @ 0s → **UNSCORED**
- **Depth proxy:** active (141 frames); raw 2D at peak: 179°
- **Feedback at peak:** "Cannot score — camera angle unclear. Turn so your side faces the camera."
- **Reps counted:** 0
- **Frame log:** `scripts/form-checker-offline-output/Squat_4-log.json`

### Squat_5.mp4 (squat)

- **Duration / resolution:** 15.8s, 1080x1920
- **Pose detection:** 80/80
- **Good-form frames:** 0/80
- **Unscored frames:** 80/80
- **Form angle range:** 100° – 102°
- **Peak form:** 100° @ 0s → **UNSCORED**
- **Depth proxy:** active (80 frames); raw 2D at peak: 170°
- **Feedback at peak:** "Cannot score — camera angle unclear. Turn so your side faces the camera."
- **Reps counted:** 0
- **Frame log:** `scripts/form-checker-offline-output/Squat_5-log.json`

### squats_5.mp4 (squat)

- **Duration / resolution:** 12.7s, 2160x3840
- **Pose detection:** 64/64
- **Good-form frames:** 0/64
- **Unscored frames:** 64/64
- **Form angle range:** 100° – 101°
- **Peak form:** 100° @ 0s → **UNSCORED**
- **Depth proxy:** active (64 frames); raw 2D at peak: 175°
- **Feedback at peak:** "Cannot score — camera angle unclear. Turn so your side faces the camera."
- **Reps counted:** 0
- **Frame log:** `scripts/form-checker-offline-output/squats_5-log.json`

### Push_UPS_1.mp4 (pushup)

- **Duration / resolution:** 18.5s, 4096x2160
- **Pose detection:** 93/93
- **Good-form frames:** 0/93
- **Unscored frames:** 93/93
- **Form angle range:** 90° – 164°
- **Peak form:** 90° @ 0s → **UNSCORED**
- **Depth proxy:** active (93 frames); raw 2D at peak: 168°
- **Feedback at peak:** "Cannot score — camera angle unclear. Turn so your side faces the camera."
- **Reps counted:** 1 @ 0.4s
- **Frame log:** `scripts/form-checker-offline-output/Push_UPS_1-log.json`

### Push_UPS_2.mp4 (pushup)

- **Duration / resolution:** 10.0s, 2160x3840
- **Pose detection:** 51/51
- **Good-form frames:** 0/51
- **Unscored frames:** 51/51
- **Form angle range:** 90° – 170°
- **Peak form:** 90° @ 0s → **UNSCORED**
- **Depth proxy:** active (51 frames); raw 2D at peak: 169°
- **Feedback at peak:** "Cannot score — camera angle unclear. Turn so your side faces the camera."
- **Reps counted:** 1 @ 0.4s
- **Frame log:** `scripts/form-checker-offline-output/Push_UPS_2-log.json`

### Push_UPS_3.mp4 (pushup)

- **Duration / resolution:** 7.4s, 4096x1680
- **Pose detection:** 37/37
- **Good-form frames:** 0/37
- **Unscored frames:** 37/37
- **Form angle range:** 90° – 139°
- **Peak form:** 90° @ 0s → **UNSCORED**
- **Depth proxy:** active (37 frames); raw 2D at peak: 136°
- **Feedback at peak:** "Cannot score — camera angle unclear. Turn so your side faces the camera."
- **Reps counted:** 1 @ 0.4s
- **Frame log:** `scripts/form-checker-offline-output/Push_UPS_3-log.json`

### Push_UPS_4.mp4 (pushup)

- **Duration / resolution:** 21.7s, 1920x1080
- **Pose detection:** 109/109
- **Good-form frames:** 0/109
- **Unscored frames:** 109/109
- **Form angle range:** 90° – 159°
- **Peak form:** 90° @ 0s → **UNSCORED**
- **Depth proxy:** active (109 frames); raw 2D at peak: 167°
- **Feedback at peak:** "Cannot score — camera angle unclear. Turn so your side faces the camera."
- **Reps counted:** 1 @ 0.4s
- **Frame log:** `scripts/form-checker-offline-output/Push_UPS_4-log.json`

### Lunges_1.mp4 (lunge)

- **Duration / resolution:** 45.4s, 2160x4096
- **Pose detection:** 227/227
- **Good-form frames:** 0/227
- **Unscored frames:** 1/227
- **Form angle range:** 104° – 128°
- **Peak form:** 104° @ 0s → **UNSCORED**
- **Feedback at peak:** "Turn so your side faces the camera — knee bend must be visible"
- **Reps counted:** 0
- **Frame log:** `scripts/form-checker-offline-output/Lunges_1-log.json`

### Lunges_2.mp4 (lunge)

- **Duration / resolution:** 11.9s, 720x1280
- **Pose detection:** 60/60
- **Good-form frames:** 0/60
- **Unscored frames:** 60/60
- **Form angle range:** 150° – 152°
- **Peak form:** 150° @ 0.2s → **UNSCORED**
- **Feedback at peak:** "Turn so your side faces the camera — knee bend must be visible"
- **Reps counted:** 1 @ 0.8s
- **Frame log:** `scripts/form-checker-offline-output/Lunges_2-log.json`

### Lunges_3.mp4 (lunge)

- **Duration / resolution:** 11.1s, 3840x2160
- **Pose detection:** 56/56
- **Good-form frames:** 6/56
- **Unscored frames:** 43/56
- **Form angle range:** 99° – 103°
- **Peak form:** 99° @ 2.4s → **PASS**
- **Feedback at peak:** "Extend your back leg further for a full lunge"
- **Reps counted:** 0
- **Frame log:** `scripts/form-checker-offline-output/Lunges_3-log.json`

### Plank_2.mp4 (plank)

- **Duration / resolution:** 20.3s, 2160x4096
- **Pose detection:** 102/102
- **Good-form frames:** 0/102
- **Unscored frames:** 2/102
- **Form angle range:** 99° – 151°
- **Peak form:** 151° @ 15.8s → **FAIL**
- **Feedback at peak:** "Hips too high — lower into a straight line"
- **Hold credits:** 0 (10s increments); max continuous hold: 0s
- **Frame log:** `scripts/form-checker-offline-output/Plank_2-log.json`

### Plank_3.mp4 (plank)

- **Duration / resolution:** 9.4s, 3840x2160
- **Pose detection:** 47/47
- **Good-form frames:** 47/47
- **Form angle range:** 175° – 178°
- **Peak form:** 178° @ 3.2s → **PASS**
- **Feedback at peak:** "Perfect plank form!"
- **Hold credits:** 0 (10s increments); max continuous hold: 9s
- **Frame log:** `scripts/form-checker-offline-output/Plank_3-log.json`

### Plank_4.mp4 (plank)

- **Duration / resolution:** 9.0s, 4096x1728
- **Pose detection:** 45/45
- **Good-form frames:** 45/45
- **Form angle range:** 166° – 169°
- **Peak form:** 169° @ 0s → **PASS**
- **Feedback at peak:** "Perfect plank form!"
- **Hold credits:** 0 (10s increments); max continuous hold: 8s
- **Frame log:** `scripts/form-checker-offline-output/Plank_4-log.json`

### Plank_5.mp4 (plank)

- **Duration / resolution:** 12.3s, 1920x1080
- **Pose detection:** 62/62
- **Good-form frames:** 62/62
- **Form angle range:** 176° – 178°
- **Peak form:** 178° @ 0.2s → **PASS**
- **Feedback at peak:** "Perfect plank form!"
- **Hold credits:** 1 (10s increments); max continuous hold: 12s
- **Frame log:** `scripts/form-checker-offline-output/Plank_5-log.json`

### Planks_1.mp4 (plank)

- **Duration / resolution:** 27.5s, 4096x2160
- **Pose detection:** 138/138
- **Good-form frames:** 137/138
- **Form angle range:** 157° – 172°
- **Peak form:** 172° @ 17s → **PASS**
- **Feedback at peak:** "Perfect plank form!"
- **Hold credits:** 2 (10s increments); max continuous hold: 26s
- **Frame log:** `scripts/form-checker-offline-output/Planks_1-log.json`
