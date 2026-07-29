# AI Form Checker — Technical Audit (2026-07-29)

**Scope:** Read-only audit of the pose-detection "form checker" feature. No logic was changed as part of this audit (per instructions). This document describes exactly what the current implementation does, cites exact code locations, and calls out where thresholds are unverified/arbitrary.

**Files reviewed:**

| Path | Role |
|------|------|
| `src/components/exercise/PoseDetector.tsx` | Core: MediaPipe pose pipeline, angle math, form/rep logic, camera lifecycle |
| `src/app/(public)/exercise-check/page.tsx` | Page shell (hero + gate + steps) |
| `src/components/exercise/ExerciseCheckGate.tsx` | Auth + subscription-plan gate around `PoseDetector` |
| `src/components/exercise/ExerciseCheckSteps.tsx` | "How it works" instructional UI |
| `src/app/api/gamification/form-check/route.ts` | Server API that records a completed session and awards XP |
| `src/lib/gamification.ts` | `recordFormCheckSession`, `XP_REWARDS` |
| `src/lib/achievements.ts` | `form_master` achievement (5 sessions) |
| `src/lib/validation.ts` | `formCheckSchema` (Zod) for the API body |
| `src/lib/access.ts` / `src/lib/subscription.ts` | Plan gating (`canUseExerciseCheck`, `bypassesSubscriptionGate`) |
| `src/models/GamificationProfile.ts` | `formCheckerSessions` counter field |
| `package.json` | `@mediapipe/pose`, `@mediapipe/camera_utils`, `@mediapipe/drawing_utils` |

---

## 1. Architecture summary

The entire pose-analysis pipeline runs **client-side in the browser** using Google's **MediaPipe Pose** (`@mediapipe/pose`, BlazePose 33-landmark model). There is **no server-side computer-vision analysis** — the backend only receives a final `{ exercise, reps }` summary once the user clicks **Stop**, purely for XP/gamification bookkeeping. The server does not verify that the reported rep count is plausible or that form was actually good.

```
Browser (PoseDetector.tsx)
  ├─ getUserMedia via MediaPipe Camera helper (640×480)
  ├─ MediaPipe Pose model (WASM, loaded from jsDelivr CDN)
  ├─ Per-frame: extract landmarks → calculateAngle() → classify good/bad → rep FSM
  └─ On Stop (if reps > 0): POST /api/gamification/form-check { exercise, reps }
                                          │
                                          ▼
                          src/app/api/gamification/form-check/route.ts
                            - auth + role check (role === 'user' only)
                            - rate limit (rateLimitAi)
                            - re-check Pro/Elite plan (canUseExerciseCheck)
                            - recordFormCheckSession(userId, reps) → XP + achievement check
```

---

## 2. Page URL & access gating

**Route:** `/exercise-check` (`src/app/(public)/exercise-check/page.tsx`, despite living in the `(public)` route group it is gated post-render, not by middleware).

Gate logic (`ExerciseCheckGate.tsx`):

1. Session loading → `PageLoader`.
2. No logged-in user → sign-in CTA linking to `/login`.
3. Logged-in but not Pro/Elite plan (and not a privileged role) → upgrade CTA linking to `/subscription`.
4. Otherwise → renders `<PoseDetector />`.

Privileged roles (`admin`, `super_admin`, `trainer`, `gym_owner`) bypass the subscription check (`bypassesSubscriptionGate`). Regular `user` accounts need the **Pro** or **Elite** plan; **Basic** plan users are blocked.

---

## 3. Supported exercises

Defined as a single hardcoded config object, `EXERCISES`, in `src/components/exercise/PoseDetector.tsx` (lines 16–49). This is the **only** place exercise support is declared — there is no separate exercise-catalog integration for this feature.

| Exercise | Joints (MediaPipe indices) | "Good" angle | Rep-reset angle |
|----------|----------------------------|---------------|------------------|
| Squat | `[23, 25, 27]` (L-hip, L-knee, L-ankle) | ≤ **100°** | ≥ **160°** |
| Push-Up | `[11, 13, 15]` (L-shoulder, L-elbow, L-wrist) | ≤ **90°** | ≥ **160°** |
| Lunge | `[23, 25, 27]` (L-hip, L-knee, L-ankle) — **identical to squat** | ≤ **100°** | ≥ **160°** |
| Plank | `[11, 23, 27]` (L-shoulder, L-hip, L-ankle) | ≥ **160°** | N/A (no rep counting) |

Only **4 exercises** are supported. There is no configuration for other common lifts (deadlift, overhead press, bicep curl, etc.).

**Left-side landmarks only.** Right-side landmarks (12/14/16/24/26/28 = shoulder/elbow/wrist/hip/knee/ankle) are never read for form/angle math. A user facing the camera with their left side occluded (e.g., turned the "wrong" way) will get degraded or no angle signal, even though MediaPipe would happily report right-side landmarks.

---

## 4. Landmark model

MediaPipe Pose's standard 33-point BlazePose topology is used. Landmarks actually consumed by this feature:

| Index | Landmark | Used by |
|------:|----------|---------|
| 11 | Left shoulder | Push-up, Plank |
| 13 | Left elbow | Push-up |
| 15 | Left wrist | Push-up |
| 23 | Left hip | Squat, Lunge, Plank |
| 25 | Left knee | Squat, Lunge |
| 27 | Left ankle | Squat, Lunge, Plank |

Model options set at init:

```ts
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
})
```

Assets are fetched at runtime from the jsDelivr CDN (`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`) — the feature requires internet access to that CDN even though the app itself may be self-hosted; there is no bundled/offline fallback.

---

## 5. Angle calculation

```ts
function calculateAngle(a, b, c): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs(radians * 180 / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}
```

This is the standard 2D interior-angle-at-vertex formula (vertex = the middle joint `b`, e.g. the knee for a hip–knee–ankle triple), computed on **2D pixel coordinates** projected from the (x, y) landmark output (no depth/z used, no 3D correction for camera angle or perspective distortion). Angle is clamped to a max of 180°.

**No visibility/confidence gating is applied to the three angle joints themselves.** MediaPipe returns a per-landmark `visibility` score, but the code only uses `visibility > 0.5` to decide whether to *draw* a joint on the skeleton overlay — the same low-confidence landmark is still used in the angle math and can silently produce a noisy or wrong "good/bad" classification.

---

## 6. Good/bad form classification & rep counting

```ts
const good = selectedExercise === 'plank'
  ? currentAngle >= ex.goodAngle
  : currentAngle <= ex.goodAngle

if (selectedExercise !== 'plank') {
  if (currentAngle <= ex.goodAngle && repStateRef.current === 'up') {
    repStateRef.current = 'down'
  } else if (currentAngle >= ex.repAngle && repStateRef.current === 'down') {
    repStateRef.current = 'up'
    // rep count += 1
  }
}
```

- **Binary classification only** — "good" or "bad", no graded/partial score, no secondary form cues (e.g., knee valgus/caving, spinal rounding, torso lean, foot placement, tempo).
- **Rep finite-state machine**: a rep is counted when the tracked angle crosses below the "good" threshold (bottom of the movement) and then back above the "reset" threshold of 160° (top/lockout). This is a simple two-state (`up`/`down`) hysteresis counter — it does not check that the transition happened within any max/min time window, so a very slow or very fast, partial-range motion that still crosses both thresholds counts as a full rep.
- **Squat and Lunge share identical joints and thresholds.** The lunge's "Lower your back knee" feedback string is purely cosmetic — the code never looks at a back-leg landmark, so a lunge is scored exactly like a squat.
- **Plank never counts reps** (`repAngle: 0` is unused for plank; the `if (selectedExercise !== 'plank')` guard skips the FSM entirely). This has a downstream consequence — see §8.
- **No-pose fallback**: when `results.poseLandmarks` is falsy, the UI shows "No pose detected — make sure your full body is visible" and skips angle/rep updates for that frame.

---

## 7. Threshold provenance — ⚠️ ARBITRARY, NOT CITED

None of the angle thresholds (100°, 90°, 160°) or the confidence thresholds (`0.5` detection/tracking, `0.5` visibility for drawing) have any comment, citation, or reference to a biomechanics standard (e.g., NSCA, ACSM, or a specific published pose-estimation exercise-classification paper) anywhere in the code, commit history, or accompanying docs. They read as reasonable-looking heuristic guesses (e.g., ~90° at the elbow for a "full" push-up, ~100° at the knee for squat depth, ~160° for "near lockout/standing"), but **this audit cannot confirm they are grounded in any external source** — they should be treated as **unverified, hardcoded magic numbers** until a citation or empirical validation is added.

Recommendation (not implemented, per audit-only scope): if these thresholds are meant to reflect real fitness-coaching standards, add inline citations (e.g., link to ACE/NSCA guidance on squat depth, parallel-thigh angle, etc.) or empirically tune/validate them against labeled video data, and consider gating angle math on landmark `visibility` rather than only using it for the overlay.

---

## 8. Gamification / XP integration

```ts
export const XP_REWARDS = {
  workout_complete: 50,
  meal_log: 15,
  trainer_connected: 30,
  form_check: 25,
  progress_log: 10,
} as const

export async function recordFormCheckSession(userId, reps) {
  profile.formCheckerSessions += 1
  const xpAmount = reps >= 5 ? XP_REWARDS.form_check + 10 : XP_REWARDS.form_check // 25 or 35
  await awardXp(userId, xpAmount)
  // achievement check runs inside awardXp
}
```

- Session with 1–4 reps → **25 XP**; ≥5 reps → **35 XP**.
- Achievement `form_master`: "Complete 5 AI form-check sessions", unlocked once `formCheckerSessions >= 5` — counts **sessions**, not reps or good-form ratio.
- **Server never validates exercise name against the 4 supported keys**, nor validates that the reported rep count is achievable in the session duration — it only Zod-validates `exercise: string(1–80)` and `reps: int(1–500)`. A client could POST any `reps` value for any completed session (this is an existing trust boundary — the form-check page is behind auth + a paid-plan gate, so the practical abuse surface is limited to a paying user inflating their own XP).
- **Plank cannot earn XP through the normal flow**: since plank never increments `reps` (§6), clicking Stop after only doing a plank hold sends `reps = 0`, and the client explicitly skips the API call when `reps === 0` (`if (reps > 0) { fetch(...) }` in `PoseDetector.tsx`). This is a real behavioral gap: users who select "Plank" get live form feedback but no way to earn form-check XP/achievement progress from it.

---

## 9. Camera & permissions handling

- No explicit call to `navigator.mediaDevices.getUserMedia` in this component — the MediaPipe `Camera` helper (`@mediapipe/camera_utils`) wraps it and triggers the browser's native permission prompt the first time "Start Camera" is clicked.
- Resolution requested: **640×480**.
- On failure (permission denied, no camera, or any other camera-start exception), the code catches broadly and sets:
  > "Camera access denied or not available. Allow camera permissions and refresh."
- There is **no use of the Permissions API** to detect a previously-denied permission ahead of time, and **no deep link/button to the browser's site-settings UI** — the only remediation offered to the user is the text instruction to "allow camera permissions and refresh."
- Camera stream and MediaPipe pipeline are torn down both on explicit "Stop" and on component unmount (cleanup effect), so navigating away doesn't leave the camera light on.

---

## 10. User walkthrough — live squat test

Steps to manually verify the feature in a browser (used to validate this audit's description of the UI/UX, not the internal math):

1. **Log in** at `/login` as a `user`-role account. New signups default to the **Basic** plan, which is blocked — either upgrade via `/subscription` (test/simulation mode: the `subscription/confirm` API accepts a simulated upgrade, see BUG_REPORT.md), or use a seeded account already on Pro/Elite, or log in as a privileged role (`trainer`/`admin`/`gym_owner`) which bypasses the plan gate entirely.
2. Navigate to **`/exercise-check`**.
3. If gated, you'll see either a "Sign in" CTA (not logged in) or an "Upgrade to Pro/Elite" CTA (Basic plan) — resolve per step 1.
4. Once the gate passes, `ExerciseCheckSteps` shows the "How it works" copy: *Enable camera → Select exercise → Get feedback*.
5. In the exercise picker (pill buttons), click **Squat**.
6. Click **Start Camera**. The browser will show its native "Allow camera access?" permission prompt for this site — click **Allow**.
   - If you click **Block** instead, the UI shows: *"Camera access denied or not available. Allow camera permissions and refresh."* You'd need to reset the site's camera permission from the browser's address-bar padlock/site-settings menu and refresh the page to retry.
7. Once the camera feed appears with a skeleton overlay, stand back far enough that your **full body** (hip, knee, and ankle on your left side, from the camera's point of view) is visible in frame. If not fully visible, you'll see: *"No pose detected — make sure your full body is visible."*
8. Perform a squat: descend until your left hip–knee–ankle angle reads **≤ 100°** on the live angle readout — the feedback should switch to "Great squat depth!" and the border/indicator should flip to a "good form" state.
9. Stand back up until the angle reads **≥ 160°** — this completes one rep and the rep counter increments by 1.
10. Repeat for at least 5 reps to hit the ≥5-rep XP bonus tier (35 XP instead of 25).
11. Click **Stop**. Because `reps > 0`, the client POSTs `{ exercise: "squat", reps: N }` to `/api/gamification/form-check`. Verify the XP toast/notification and, after your 5th total *session* (not rep) across any visits, confirm the "Form Master" achievement unlocks (check `/notifications` or the gamification/profile UI).

**Notes for the tester:**
- Stand so your **left side** faces the camera (or is otherwise clearly visible) — the detector ignores right-side landmarks entirely (§3).
- Good lighting and a plain background improve MediaPipe's landmark confidence; since visibility isn't gated for angle math (§5), poor lighting can silently produce incorrect "good/bad" readings rather than an explicit low-confidence warning.
- This feature requires outbound network access to `cdn.jsdelivr.net` to download the MediaPipe WASM/model assets on first load; if that CDN is blocked, "Start Camera" will fail the same way as a permissions error.

---

## 11. Summary of notable gaps (documentation only — not fixed per audit scope)

1. Only 4 exercises supported; squat and lunge are mathematically identical (lunge's back-knee cue is not actually checked).
2. Left-side-only landmark usage; no right-side fallback.
3. Angle math does not gate on landmark `visibility`, unlike the skeleton-overlay drawing which does.
4. All thresholds (100°/90°/160°, confidence 0.5) are hardcoded with no cited source — flagged as **arbitrary** pending validation.
5. Rep FSM has no timing/tempo constraint — very fast partial reps that still cross both thresholds count as full reps.
6. Plank cannot earn XP/achievement progress via the current stop+reps gate (reps always 0 for plank).
7. Server-side `POST /api/gamification/form-check` trusts the client-reported rep count entirely; no server-side pose or plausibility validation.
8. No dedicated e2e test coverage exists for `/exercise-check` in `e2e/` at the time of this audit.
9. Feature has a hard runtime dependency on the `cdn.jsdelivr.net` CDN for MediaPipe assets — no bundled/offline fallback.
