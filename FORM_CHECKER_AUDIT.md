# AI Form Checker — Technical Audit (2026-07-29)

> **Update (2026-07-29, later session):** Sections 1-11 below are the original **read-only** audit and are left intact for history. **Section 12** documents the fixes actually implemented afterward (bilateral landmarks, cited thresholds, graded feedback, premium-gate alignment) and an honest session report on what could/could not be verified without a real camera.

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

---

## 12. Fixes applied in this session (2026-07-29, later)

All changes are in `src/components/exercise/PoseDetector.tsx` unless noted. Item numbers reference §11 above.

### 12.1 Bilateral landmarks (item 2)

Every exercise now reads **both** left and right side landmarks (e.g. squat: `[23,25,27]` **and** `[24,26,28]`). Per-joint MediaPipe `visibility` is checked (`MIN_JOINT_VISIBILITY = 0.5`, matching `minDetectionConfidence`/`minTrackingConfidence`) before a side is trusted:

- If both sides pass the visibility gate, the angle is the **average** of both sides (more robust to single-limb tracking noise).
- If only one side is visible (user angled away from camera on the other side), that side is used alone — this is the fallback the audit recommended, not the previous "left-only, no fallback" behavior.
- If neither side is visible, the UI now shows **"Move fully into frame — joints not clearly visible"** instead of silently computing an angle from a low-confidence landmark (this also closes item 3: angle math is now gated on `visibility`, the same threshold used for the skeleton overlay).

**Lunge specifically** now uses both legs to distinguish the front (bent) leg from the back (extended) leg — see `getLungeFeedback()`. Previously (§6, item 1) squat and lunge were mathematically identical and the "lower your back knee" cue was cosmetic; now the back leg's own angle is checked against a 150° extension threshold and the cue is only shown when the back leg is genuinely under-extended.

### 12.2 Cited thresholds (item 4)

Every `goodAngle` / `repAngle` in `EXERCISES` now has an inline comment plus a `citation` string (also surfaced under the exercise picker in the UI as "Threshold source: …"):

| Exercise | Depth threshold | Source | Reset/tolerance | Status |
|---|---|---|---|---|
| Squat | 100° knee flexion | NASM Essentials of Personal Fitness Training (7th ed.) / ACE squat-depth guidance — "parallel" depth ≈ 90-100° knee flexion | 160° reset | Reset angle is a **BEST ESTIMATE** (not independently cited) |
| Push-Up | 90° elbow flexion | ACE push-up test protocol / NASM push-up form standard — full rep ≈ upper arm parallel to floor | 160° reset | Reset angle is a **BEST ESTIMATE** |
| Lunge | 100° front-knee flexion (shared w/ squat) + 150° back-leg extension | Front knee: NASM/ACE (as above). Back-leg 150° threshold | — | Back-leg threshold is a **BEST ESTIMATE** |
| Plank | 160° shoulder-hip-ankle | NASM straight-body-line guidance (ideal ≈ 180°) | — | 160° tolerance band is a **BEST ESTIMATE**, not an exact published figure |
| Joint visibility gate | 0.5 | MediaPipe Pose documented default `minDetectionConfidence`/`minTrackingConfidence` | — | Matches upstream default, not app-specific |
| Min rep hold | 250 ms | — | — | **BEST ESTIMATE** anti-noise guard, added this session (item 5) |
| Plank hold credit | 10 s / "rep" | — | — | **BEST ESTIMATE**, added this session (item 6) |

No claim is made that 100°/90°/160°/150° are the *only* correct values — they are the same order-of-magnitude figures used by mainstream certifying bodies' depth/lockout descriptions, cited above; anything not backed by an external citation is explicitly labeled **BEST ESTIMATE** both in code comments and in this table, per instructions.

### 12.3 Real-time feedback — specific cues, not binary (item from Phase 1 brief)

`getGradedFeedback()`, `getLungeFeedback()`, and `getPlankFeedback()` replace the old flat good/bad strings with cues that reference the actual measured deviation, e.g.:
- "Almost there — 12° more to go" instead of a generic "Go lower".
- "Hips sagging — engage your core and lift hips" vs. "Hips too high — lower into a straight line" (previously both faults produced the identical "Raise your hips" message; now the shoulder-ankle line is used to infer sag vs. pike direction from the hip's actual vs. expected y-position).
- "Extend your back leg further for a full lunge" only fires when the back leg is specifically under-extended (see 12.1).

### 12.4 Rep-counting integrity (item 5)

`MIN_REP_HOLD_MS = 250` requires the tracked angle to stay in the "down" position for at least 250ms before the "up" transition can complete a rep, reducing (not eliminating) the previously-noted issue of very fast, partial-range motions counting as full reps. This is a best-estimate anti-noise guard, not a tempo/cadence validator — a determined user can still game it.

### 12.5 Plank can now earn XP (item 6)

Plank has no concentric/eccentric cycle, so it's tracked differently: every `PLANK_HOLD_INCREMENT_MS` (10s) of **continuous good-form hold** increments the session's "rep" counter by 1 (surfaced in the UI as hold-time seconds, not an angle). On Stop, this non-zero counter is sent to `POST /api/gamification/form-check` exactly like a rep-based exercise, so a plank-only session now earns XP and progresses the `form_master` achievement — closing the gap documented in §8 ("Plank cannot earn XP through the normal flow"). No server-side change was needed for this — `formCheckSchema` already accepted any `reps` 1-500 for any exercise string.

### 12.6 Premium gate alignment (Phase 2)

- `src/components/exercise/ExerciseCheckGate.tsx` now renders the shared `AccessGate` / `SignInGate` components (`src/components/shared/AccessGate.tsx`) — the same ones `analytics/page.tsx` uses — instead of a bespoke inline panel, so the sign-in and upgrade UX is now visually and structurally consistent across gated Pro features.
- `src/app/api/gamification/form-check/route.ts` previously hard-rejected any `role !== 'user'` with 403 "Member account required" — this disagreed with the client gate, which lets privileged roles (`admin`/`super_admin`/`trainer`/`gym_owner`) through via `bypassesSubscriptionGate()`. The route now mirrors `api/analytics/summary`'s pattern exactly: privileged roles bypass the plan check, everyone else needs `canUseExerciseCheck(plan)`, else a `403` with a clear JSON `message` ("AI form checking requires Pro or Elite plan"). Basic-plan `user` accounts are still correctly blocked — see `e2e/exercise-check-and-checklist.spec.ts`.

### 12.7 Honest session report (per Phase 1 instructions)

**What this agent could verify, and how:**
- All of the above via static code reading + `npm run build` (TypeScript compiles, no runtime type errors).
- Premium gating (client UI text + API status codes) via real Playwright browser automation against a live `next dev` server + live MongoDB Atlas — see `e2e/exercise-check-and-checklist.spec.ts` ("Basic plan is blocked in the UI", "Pro plan unlocks the exercise-check UI").
- The `POST /api/gamification/form-check` XP-award path end-to-end (real HTTP request, real DB write, real XP delta) for both Basic (403) and Pro (200 + XP) plans.

**What this agent could NOT verify, and why — the user must validate physically:**
- **Actual pose-estimation accuracy** — whether the bilateral angle averaging, the visibility gating, or the specific cited angle thresholds (100°/90°/160°/150°/160°) actually produce correct "good form" / "bad form" classifications for a real human body in front of a real webcam. This agent has no camera and cannot run MediaPipe against live video.
- **Camera position / framing**: the UI instructs users to stand far enough back that hip, knee, and ankle (or shoulder/elbow/wrist for push-ups) are in frame; whether typical home setups (webcam height, distance, angle) actually satisfy this is unverified. Recommend testing at ~2-2.5m from camera, camera at chest height, perpendicular (side-on) framing for squat/push-up/lunge and a 3/4 or side angle for plank so the shoulder-hip-ankle line is visible.
- **Lighting**: MediaPipe's landmark `visibility` confidence (now actually gating angle math, see 12.1) is known to degrade in low light or backlit conditions (window/bright light behind the subject). This was not empirically tested — only inferred from MediaPipe's own documentation and general pose-estimation literature.
- **The 250ms min-rep-hold and 10s plank-hold-credit constants** are unvalidated against real rep cadence; they were chosen to be permissive (fast lifters/short pauses shouldn't be blocked) rather than strict.
- **Bilateral averaging** assumes both sides of a symmetric bodyweight movement move together; it has not been validated against an asymmractional or single-limb variation (e.g. single-leg lunges are still fine since only one leg is "front", but a genuinely asymmetric fault, like one-sided knee valgus, would be averaged away rather than flagged — a known limitation of averaging bilateral angles, not a citation gap).

**Recommendation:** before relying on this feature for real coaching decisions, a sighted human (ideally with fitness-coaching background) should record short reference clips of correct/incorrect squats, push-ups, lunges, and planks under normal home lighting and manually confirm the on-screen angle/feedback matches expectations, across at least a "well-lit" and a "dim room" condition.

### 12.8 Re-verification (2026-07-30, retry session)

Static code audit re-run against the current tree — all §12 claims **confirmed in source**:

| Claim | Verified location | Status |
|---|---|---|
| 4 exercises (squat, pushup, lunge, plank) | `EXERCISES` in `PoseDetector.tsx` L79–139 | ✅ |
| Bilateral left+right landmarks + visibility gate | `LANDMARKS`, `resolveSide()`, `MIN_JOINT_VISIBILITY` L33–51, L145–163, L209–226 | ✅ |
| Cited thresholds + UI citation line | per-exercise `citation` + picker subtitle L423–425 | ✅ |
| Graded feedback (not binary) | `getGradedFeedback`, `getLungeFeedback`, `getPlankFeedback` L499–546 | ✅ |
| Lunge back-leg check (150° BEST ESTIMATE) | `getLungeFeedback` L515–521 | ✅ |
| Rep hold guard (250 ms) | `MIN_REP_HOLD_MS` L61, FSM L251–255 | ✅ |
| Plank XP via 10 s hold credits | `PLANK_HOLD_INCREMENT_MS` L64, plank branch L265–286, stop POST L376–395 | ✅ |
| Client Pro/Elite gate | `ExerciseCheckGate.tsx` → `canAccessExerciseCheck()` L20–32 | ✅ |
| Server Pro/Elite gate (+ privileged bypass) | `form-check/route.ts` L33–41 mirrors `bypassesSubscriptionGate` | ✅ |

**Live automation (Playwright + `next dev`, MongoDB Atlas):** `e2e/exercise-check-and-checklist.spec.ts` — Basic UI blocked (upgrade prompt, no Start Camera button), Basic API `403`, Pro UI shows Start Camera, Pro API `200` with `xpAwarded > 0`. Screenshots: `e2e/screenshots/30-exercise-check-basic-gated.png`, `31-exercise-check-pro-unlocked.png`.

**Still not verified (requires human + webcam):** real-time pose accuracy, camera framing distance, lighting degradation — unchanged from §12.7.

---

## 13. Offline validation — AI-generated reference videos (2026-08-04)

### 13.0 Scope and limitations

This section records an **offline replay test** of the production form-checker pipeline against two **AI-generated (Gemini/Veo) reference clips** at the repository root:

| File | Exercise mode | Duration | Resolution |
|---|---|---|---|
| `Squats.mp4` | squat | ~10 s | 1280×720 |
| `Push_UP.mp4` | pushup | ~10 s | 1280×720 |

**These are not real human recordings.** Synthetic footage can exhibit anatomically inconsistent joints, motion blur, or motion that does not match the labeled exercise. A failed classification here is **not automatically a production bug** — each failure below is tagged as either a likely **synthetic-footage / footage-content issue** or a **genuine pipeline concern**.

**Method:** Production logic was extracted to `src/lib/form-checker-pose.ts` (imported by both `PoseDetector.tsx` and the harness). The harness (`scripts/test-form-checker-offline.ts`) runs MediaPipe Pose in Playwright/Chromium against a `<video>` element (200 ms sample interval), then calls the same `processPoseFrame()` used live. Videos are gitignored; outputs live under `scripts/form-checker-offline-output/` (also gitignored).

**Higher-confidence validation still outstanding:** a sighted human with a real webcam, under normal home lighting, recording correct/incorrect squats and push-ups — per §12.7.

### 13.1 Phase 1 — Visual sanity (footage quality)

**Squats.mp4**
1. **Full body in frame:** Yes — side profile, head to feet visible in sampled frames (~every 1.5 s).
2. **Anatomically plausible:** Yes in static samples; typical smooth AI skin/texture. No obvious extra limbs or impossible bends in extracted frames.
3. **Lighting/contrast:** Good — white wall, even studio lighting, high landmark confidence on the visible (right) leg.
4. **Footage caveat:** Sampled frames across 0–7.5 s predominantly show **near-upright standing** posture, not clear deep squat bottom positions. Far-side (left) knee visibility is consistently low (~0.34–0.36), so the pipeline correctly falls back to **right side only**.

**Push_UP.mp4**
1. **Full body in frame:** Yes throughout.
2. **Anatomically plausible:** Mostly yes; **motion blur on a moving leg** in several frames (synthetic artifact).
3. **Lighting/contrast:** Adequate; gym mat + white wall.
4. **Footage caveat:** Motion reads as **high-plank / leg-tuck / mountain-climber style**, not sustained classic push-up bottom positions (chest near floor, elbow ~90°). Veo sparkle watermark confirms synthetic origin.

### 13.2 Pass/fail summary

| Video | Pose detection | Deepest angle (threshold) | Depth classification | Pipeline reps | Manual visual reps | Overall |
|---|---|---|---|---|---|---|
| **Squats.mp4** | 51/51 (100%) | **176°** @ 0.4 s (≤**100°** good) | **BAD** (correct given angle) | **0** | **0–1** deep squat visible* | **INCONCLUSIVE** for threshold tuning; **PASS** on detection consistency |
| **Push_UP.mp4** | 51/51 (100%) | **167°** @ 0.4 s (≤**90°** good) | **BAD** (correct given angle) | **0** | **0** classic push-up bottoms* | **INCONCLUSIVE** for threshold tuning; **PASS** on detection consistency |

\*Manual count revised after frame review: configured harness default `manualReps: 3` assumed three cycles in the clip, but extracted frames and angle trace do **not** show three depth-qualified squat or push-up bottoms. Rep FSM correctly stayed at 0 because angles never crossed `repAngle` / `goodAngle` gates.

**No production threshold changes recommended** from this data alone (see §13.5).

### 13.3 Squats.mp4 — detailed findings

**Pose consistency:** No drop-outs. All 51 sampled frames returned landmarks.

**Deepest hip–knee–ankle angle:** **176°** (right side only) at **0.4 s**. Left knee visibility **0.34–0.36** (below `MIN_JOINT_VISIBILITY = 0.5`); right knee **0.98–0.99**. Bilateral mode: **`right`** on every frame — visibility gating behaved as designed; no suspicious averaging across a bad left knee.

**Classification at deepest point:** **BAD** — feedback *"Go lower — bend knees more — you're only partway down (176°)"*. Given the ≤100° good threshold, this is **arithmetically correct**.

**Rep counting:** Pipeline **0**; FSM never entered a completed down→up cycle (`repState` remained `up` for all frames; no `"good": true` frames). Matches footage: knee flexion in the clip never approached parallel depth in 2D measurement.

**Diagnosis:** **Likely synthetic-footage + content mismatch (high confidence).** The clip appears to show shallow or absent squat depth rather than a threshold error. Side-view 2D knee angle on AI-rendered legs may also under-report flexion vs. a real human, but the dominant signal here is that measured angles stayed near **180°** (extended).

### 13.4 Push_UP.mp4 — detailed findings

**Pose consistency:** No drop-outs. 51/51 frames detected.

**Deepest shoulder–elbow–wrist angle:** **167°** (left side only) at **0.4 s**. Right elbow visibility **~0.40–0.51** (at/below gate); left arm **~0.99**. Bilateral mode: **`left`** on most frames — appropriate unilateral fallback, not erroneous averaging.

**Classification at deepest point:** **BAD** — *"Lower your chest more — you're only partway down (167°)"*. Correct vs. ≤90° threshold.

**Rep counting:** Pipeline **0**; no elbow flexion deep enough to trigger rep FSM. Manual review: **no classic push-up bottom** visible — motion is closer to plank with leg movement.

**Diagnosis:** **Likely synthetic-footage + exercise mismatch (high confidence).** Failure to count reps or mark good form reflects **footage that does not perform standard push-ups**, not a demonstrated bug in elbow-angle math or rep FSM. Motion blur on legs may have contributed to right-arm visibility flicker but did not force bad bilateral averaging.

### 13.5 Threshold proposals

**None submitted for approval.** Neither clip produced angles within 30° of the cited good thresholds (squat 100°, push-up 90°). Adjusting thresholds based on AI-generated shallow motion would risk breaking real-human validation. If real webcam clips later show systematic offset (e.g. side-camera 2D knee angles consistently ~110° at visually parallel depth), revisit with measured human footage only.

### 13.6 Structural change note

`PoseDetector.tsx` previously inlined angle, visibility, feedback, and rep FSM logic. To satisfy the requirement that offline tests use **identical** production behavior, that logic now lives in **`src/lib/form-checker-pose.ts`**, imported by both the live component and `scripts/test-form-checker-offline.ts`. Runtime behavior of the live checker is intended to be unchanged aside from TypeScript narrowing fixes for landmark drawing.

### 13.7 Reuse instructions

```bash
# Extract sanity-check frames (requires Squats.mp4 + Push_UP.mp4 at repo root)
npm run test-form-checker-frames

# Full MediaPipe + production pipeline analysis (~3 min)
npm run test-form-checker-offline
```

Replace the mp4 files with **real human webcam recordings** (same filenames or edit `VIDEOS` in the script) for higher-confidence regression testing. Do not commit video files.

### 13.8 Honest gap (unchanged from AI run)

Real-camera, real-human validation of depth thresholds, bilateral averaging under asymmetrical faults, lighting degradation, and rep cadence — **still required** before using the form checker for coaching decisions. This offline run **does not close** that gap; it only confirms the pipeline runs end-to-end on file-backed video and behaves consistently with what the synthetic clips actually contain.

---

## 13.9 Re-validation — real human footage (2026-08-05)

### 13.9.0 Scope

Re-ran `npm run test-form-checker-offline` against **real human** reference clips at the repo root (replacing the AI-generated Squats/Push_UP files and adding Lunges/Plank):

| File | Exercise mode | Duration | Resolution | Camera notes (frame review) |
|---|---|---|---|---|
| `Squats.mp4` | squat | ~33 s | 1076×1014 | **Front-facing** full-body |
| `Push_UP.mp4` | pushup | ~27.7 s | 1048×984 | **High/overhead angle** |
| `Lunges.mp4` | lunge | ~42.8 s | 1246×980 | Side profile; **screen-recording UI** visible |
| `Plank.mp4` | plank | ~30.8 s | 1192×428 | **Side profile** outdoor |

Harness updates this run: added `Lunges.mp4` + `Plank.mp4` to `VIDEOS`; fixed plank peak-angle reporting (max not min); fixed MediaPipe `onResults` listener stacking in `form-checker-offline-mediapipe.js`. Production thresholds **unchanged**.

### 13.9.1 Pass/fail summary

| Video | Pose detection | Peak depth / alignment (threshold) | Classification at peak | Good-form frames | Pipeline reps/holds | Manual visual estimate | Overall |
|---|---|---|---|---|---|---|---|
| **Squats.mp4** | 166/166 (100%) | **174°** min (≤**100°**) | **BAD** (correct vs angle) | 0/166 | **0** reps | **~5** reps (33 s clip) | **FAIL** rep counting; **2D camera limitation** |
| **Push_UP.mp4** | 139/139 (100%) | **141°** min (≤**90°**); R arm **133°** | **BAD** (correct vs angle) | 0/139 | **0** reps | **~3** reps | **FAIL** rep counting; **2D camera limitation** |
| **Lunges.mp4** | **0/214 (0%)** | n/a | n/a | 0 | **0** reps | **~4–6** lunge cycles visible | **FAIL** — detection outage |
| **Plank.mp4** | 155/155 (100%) | **173°** best (≥**160°**) | **GOOD** | 155/155 | **3** hold credits @ 10/20/30 s | **~30 s** continuous hold | **PASS** |

### 13.9.2 Squats.mp4 — detailed findings

**Pose consistency:** 100% detection; bilateral averaging on both legs (visibility ~1.0 on all joints).

**Angle trace:** Hip–knee–ankle angle stayed **174–175°** for the entire 33 s clip (spread **1°**), including frames at visual squat bottom (e.g. ~20 s). Front-facing camera geometry collapses sagittal knee flexion into near-180° 2D measurements even when depth looks correct on screen.

**Rep counting:** Pipeline **0** vs **~5** estimated visual reps — FSM never saw `angle ≤ 100°`, so no down→up cycles registered. **Not a rep-FSM bug** given measured angles.

**Diagnosis:** **Camera-angle / 2D-math limitation (high confidence).** Not evidence that the 100° threshold is wrong for side-on footage. **Recommend side-profile camera** (per §12.7) for squat validation.

### 13.9.3 Push_UP.mp4 — detailed findings

**Pose consistency:** 100% detection.

**Angle trace:** Shoulder–elbow–wrist minimum **141°** (bilateral avg); right arm reached **133°** at deepest. Push-up bottoms at ~10 s and ~20 s look visually correct in frame review, but overhead camera foreshortens the elbow angle in 2D.

**Rep counting:** Pipeline **0** vs **~3** visual reps.

**Diagnosis:** **Camera-angle / 2D-math limitation (high confidence)** for the 90° threshold as measured. The checker correctly classifies BAD relative to current math, but **good-form reps are not measurable** from this camera angle.

### 13.9.4 Lunges.mp4 — detailed findings

**Pose consistency:** **Complete failure** — MediaPipe returned **zero landmarks** on every sampled frame (214/214 drop-outs). Feedback: *"No pose detected"*. Re-tested at t = 0–40 s with the same result. Frame review shows a valid side-profile lunge bottom (~90° front knee visually), but footage includes a **screen-recording “Pause recording” overlay** and may be a cropped screen capture — likely confusing MediaPipe or degrading decode quality.

**Diagnosis:** **Footage / capture artifact (high confidence)** — not a lunge threshold or FSM issue. **Re-record without screen UI**, full-body in frame, side-on, direct MP4 (not screen capture) before judging lunge logic.

### 13.9.5 Plank.mp4 — detailed findings

**Pose consistency:** 100% detection.

**Alignment:** Shoulder–hip–ankle **171–173°** throughout; **155/155** frames classified **GOOD** (≥160°).

**Hold credits:** Pipeline awarded **3** credits at **10 s, 20 s, 30 s** — matches a ~31 s continuous plank clip. **Rep/hold accuracy: PASS.**

**Diagnosis:** **No issues found** on this footage. Plank path (alignment check + 10 s hold increments) behaves as designed.

### 13.9.6 Threshold proposals (awaiting your approval — NOT applied)

| Exercise | Current | Proposal | Evidence | Confidence | Recommendation |
|---|---|---|---|---|---|
| Squat | 100° good | **No change** | Front-camera 2D min 174° at visual parallel depth | High that issue is camera, not threshold | Require side-on footage before any change |
| Push-up | 90° good | **Optional ~130–135°** only if high-angle camera is a deliberate supported setup | Deepest measured 133° (right) at visual full rep | **Low** — would over-permit shallow reps on side camera | **Do not change** unless product accepts overhead camera as primary |
| Lunge | 100° good | **No change** | No angle data (detection failed) | n/a | Fix footage first |
| Plank | 160° good | **No change** | 173° measured; 100% good | High | Keep as-is |

### 13.9.7 Updated honest gap

| Area | Status after real-footage run |
|---|---|
| Plank alignment + hold credits | **Validated** on side-profile real human clip |
| Squat / push-up depth thresholds | **Still unvalidated** on side-profile real human clips — front/overhead test footage incompatible with 2D joint-angle math |
| Lunge pipeline | **Blocked** — need clean re-record without screen-capture artifacts |
| Live webcam UX (framing prompts, lighting) | Still outstanding per §12.7 |

### 13.9.8 Reuse

```bash
npm run test-form-checker-offline   # all four clips at repo root
```

Debug frame captures from this session: `scripts/form-checker-offline-output/debug-frames/` (gitignored).

---

## 14. P0 — Honest camera-angle detection & side-profile onboarding (2026-08-08)

### 14.1 Root cause of false ~100° depth-proxy PASS

Front-facing squat/lunge footage reports hip–knee–ankle angles near **170–179°** in 2D because sagittal knee flexion collapses when the camera faces the athlete. When `peakAngleSpan` stayed below **8°**, `getRepTrackingAngle()` activated the **depth proxy** (`applyDepthProxy` → `depthToPseudoAngle`).

`depthToPseudoAngle` maps the observed min–max range of hip-drop or knee-depth Y-coordinates onto a pseudo-angle from **180°** down to `goodAngle` (**100°**). Any small vertical movement during a squat therefore produced a pseudo-angle near **100°**, and `processPoseFrame()` classified those frames as **GOOD** with *"Great squat depth!"* — even when raw 2D angles proved the camera could not see real flexion.

This was a **confidence failure**, not a threshold error: the pipeline reported a confident PASS from a fallback signal that was never validated against side-profile geometry.

### 14.2 Changes implemented

**`src/lib/form-checker-pose.ts`**

- Added `ScoringState` (`good` | `bad` | `unscored`) and `CameraQuality` (`side_ok` | `turn_90` | `step_back` | `unclear`).
- `hasConfidentScoring()` — scoring only when `peakAngleSpan` meets per-exercise thresholds **and** depth proxy is **not** active. Plank uses alignment-based confidence (stable ≥160° reads). Squat/lunge allow confident scoring when real 2D flexion clearly shows depth without proxy.
- Persistent **UNSCORED** feedback after **2.5 s** of low span with detected movement: *"Cannot score — camera angle unclear. Turn so your side faces the camera."*
- Depth proxy may still assist rep FSM hints, but **`useDepthProxy` blocks confident good/bad** scoring.
- Bilateral squat/lunge with real flexion ≤ threshold skips depth proxy even when cumulative span is low (side-view bottom hold).
- `processPoseFrame` now updates `peakAngleSpan` for **plank** (previously only updated inside `getRepTrackingAngle`, which plank skipped).
- `ProcessedPoseFrame` exposes `scoringState`, `cameraQuality`, `peakAngleSpan`.

**`src/components/exercise/PoseDetector.tsx`**

- Pre-camera **setup step** with inline SVG side-profile diagram and exercise-specific framing tips.
- Live **camera quality badge**: Side view OK / Turn 90° / Step back.
- Amber styling for **unscored** feedback (distinct from green good / red bad).

**Harness / docs**

- `scripts/test-form-checker-offline.ts` — logs `scoringState`, `unscoredFrameCount`; verdict PASS / FAIL / **UNSCORED**; removed debug agent log.
- `scripts/generate-video-results.js` — UNSCORED verdict support.

### 14.3 Before / after results (18 reference videos)

| Exercise | Before (peak verdict) | After (peak verdict) |
|----------|----------------------|----------------------|
| **Squats (6)** | 6 PASS (all depth-proxy ~100°) | 5 UNSCORED, 1 PASS (`Squat_3` side-profile real 81°) |
| **Push-ups (4)** | 4 FAIL | 4 UNSCORED (depth-proxy blocked from PASS) |
| **Lunges (3)** | 1 PASS (`Lunges_3`), 2 FAIL | 1 PASS (`Lunges_3`), 2 UNSCORED |
| **Planks (5)** | 4 PASS, 1 FAIL (`Plank_2`) | 4 PASS, 1 FAIL (`Plank_2`) |

**Overall:** 11/18 PASS → **6 PASS, 11 UNSCORED, 1 FAIL** (honest reporting; front-facing squats no longer false PASS).

### 14.4 P1 recommendation

**Hold P1 for review** until stakeholders confirm P0 UX (setup diagram, amber unscored state, camera badge) on a real webcam. Next P1 candidates after sign-off:

1. Rep counting from depth proxy with explicit "rep detected / form unscored" split.
2. Lunge back-leg extension scoring when front knee is unscored due to angle.
3. Push-up side-profile rep validation on real webcam clips (offline push-up videos remain unscored).

Do **not** lower squat/push-up angle thresholds until side-profile human footage validates depth at measured angles.

### 14.5 Reuse

```bash
npm run test-form-checker-analyze-new   # 18 videos at repo root
node scripts/generate-video-results.js  # refresh FORM_CHECKER_VIDEO_RESULTS.md
npx tsx scripts/verify-form-checker-rom.ts
```
