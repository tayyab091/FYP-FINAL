# T.E.S.T. — Bug Report (2026-07-29)

Live verification: `npm run dev` + `npm run live-verify` (partial run; long AI steps may delay completion). Production build: `npm run build` passes after slug migration.

## Fixed in this session

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| BUG-001 | High | Public trainer URLs used MongoDB ObjectIds (`/coaching/[id]`) | Trainer `slug` field, `/coaching/[slug]`, API lookup by slug or id, 301 from ObjectId URLs |
| BUG-002 | High | `trainer-slug.ts` pulled Mongoose into client bundle (build failed) | Split `trainer-slug.ts` (client) vs `trainer-slug-server.ts` (DB) |
| BUG-003 | Low | Delete account fetch omitted explicit `credentials` | Added `credentials: 'include'` on settings delete |
| BUG-004 | Medium | `node scripts/backfill-trainer-slugs.mjs` failed with `querySrv ECONNREFUSED` even though the running app connects fine | Standalone script used raw `mongoose.connect(srvUri)`, relying on the OS resolver for `mongodb+srv://` SRV lookups (blocked on this network/ISP). `src/lib/mongodb.ts` already worked around this by resolving SRV/TXT records via Google/Cloudflare DNS (`8.8.8.8`/`1.1.1.1`) and connecting with a direct `mongodb://` URI. Ported the same `toDirectMongoUri()` workaround into `scripts/backfill-trainer-slugs.mjs`. Re-ran successfully: `Backfilled 10 trainer slug(s)` (all seeded trainers now have slugs, e.g. `ali-hassan`, `sarah-khan`, …). |

## Session notes — concurrent-agent race (2026-07-29)

Two agent sessions ended up running shell/git commands against the **same non-worktree checkout** at overlapping times during this task (the prior "Phases 1–5" session kept committing until ~12:05, into this session's runtime). Effects observed and handled:

- One in-progress edit (the BUG-004 DNS fix, first attempt) was silently overwritten on disk when the other session wrote/committed an older copy of `scripts/backfill-trainer-slugs.mjs` mid-edit. Detected via `git reflog show musadiq` (unexpected `filter-branch: rewrite` / `commit (amend)` entries with timestamps after this session started) and by re-diffing the working tree against `HEAD` before continuing.
- No other work was lost: several of this session's other edits (e.g. resolving `POST /api/relationships/request/[trainerId]` by slug-or-id) were actually picked up and committed by the other session, since it shared the same working directory.
- Confirmed the race had stopped (no commits in `git reflog` for 40+ minutes) before resuming, re-applied the reverted DNS fix, and re-verified it end-to-end (`node scripts/backfill-trainer-slugs.mjs` → success).
- **Recommendation:** never run two agents against the same non-worktree checkout concurrently — use `git worktree add` (or fully serialize handoffs) per agent to avoid clobbered edits.

## Fixed in this session (2026-07-29, later — Form Checker / Gating / Checklist)

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| BUG-009 | Medium | `POST /api/gamification/form-check` hard-rejected any `role !== 'user'` with 403 "Member account required", but the client gate (`ExerciseCheckGate`, `canAccessExerciseCheck`) lets privileged roles (`admin`/`super_admin`/`trainer`/`gym_owner`) through via `bypassesSubscriptionGate()`. A privileged user could open `/exercise-check`, use the camera, click Stop, and get a confusing 403 on submit. | Route now mirrors `api/analytics/summary`'s pattern: `bypassesSubscriptionGate(role)` skips the plan check entirely for privileged roles; everyone else needs `canUseExerciseCheck(plan)`. See `src/app/api/gamification/form-check/route.ts`. |
| BUG-010 | Medium | `ExerciseCheckGate.tsx` used a bespoke inline "sign in" / "upgrade" panel instead of the shared `AccessGate`/`SignInGate` components that `analytics/page.tsx` (and others) use, so the upgrade-prompt UX was visually inconsistent between Pro-gated features. | Refactored `ExerciseCheckGate` to render `<SignInGate>` / `<AccessGate>` — see `src/components/exercise/ExerciseCheckGate.tsx`. |
| **BUG-011** | **High** | **Workout checklist / XP persistence bug** (my-fitness workout flow). Per-exercise checkbox completion lived only in client React state (`completedExercises`) — never sent to the server except at "Complete Workout" time. Reloading or navigating away during a workout lost all checkbox state *and* the `activeLogId`/`workoutStarted` flags, silently abandoning the `in_progress` `WorkoutLog` document (orphaned in the DB) and forcing the user to start over. | See "Before/after" below. |
| BUG-012 | Low (defense-in-depth) | `PUT /api/tracking/logs/:id/complete` guarded against double-completion with a plain `findOne` → check `status` → `save()`, which has a TOCTOU race window under concurrent requests (two simultaneous clicks could both pass the check before either saves, double-awarding XP). No explicit per-log "already paid out" flag existed either. | Replaced with an atomic `findOneAndUpdate({ status: { $ne: 'completed' } }, { $set: { status: 'completed', ... } })` (single Mongo operation — only one caller can win the transition) **plus** a new `xpAwarded: Boolean` field on `WorkoutLog`, checked before calling `awardWorkoutXp`, as an independent second guard. |

### BUG-011 — Before / after

**Before:**
- `WorkoutLog.exercises[]` had no `completed` flag — the schema only tracked `name`/`setsCompleted`/`repsCompleted`/`notes`.
- Checkbox `onChange` only updated `useState<number[]>` locally; no network call.
- `GET /api/tracking/logs` only ever returned `status: 'completed'` logs — there was no way to fetch an `in_progress` log, so a page reload had nothing to restore from.
- "Complete Workout" *did* use the local checkbox state (this part was already correct) but that state was fragile — a reload before clicking Complete lost everything.
- `Cancel` only cleared local state; the `in_progress` `WorkoutLog` row was left orphaned in the database forever.

**After:**
- `WorkoutLog.exercises[].completed: Boolean` (default `false`) persists per-exercise checklist state (`src/models/WorkoutLog.ts`).
- New `PATCH /api/tracking/logs/:id` (`src/app/api/tracking/logs/[id]/route.ts`) accepts `{ exerciseIndex, completed }` and updates a single checklist item on an `in_progress` log (rejects if the log isn't `in_progress`, i.e. can't edit a completed/skipped log). The same endpoint accepts `{ status: 'skipped' }` to explicitly cancel/abandon a workout server-side.
- New `GET /api/tracking/logs/active` (`src/app/api/tracking/logs/active/route.ts`) returns today's `in_progress` log (if any) for the current user.
- `MyFitnessInner.tsx`'s initial data-load effect now also calls `/api/tracking/logs/active` and, if a log is found, restores `activeLogId`, `workoutStarted`, and `completedExercises` (derived from `exercises[].completed`) — a reload or revisit **no longer loses the in-progress checklist**.
- The checkbox `onChange` now calls `handleToggleExercise()`, which optimistically updates local state **and** fires a `PATCH` to persist the toggle.
- `Cancel` now calls `handleCancelWorkout()`, which `PATCH`es `{ status: 'skipped' }` so the log is properly closed out instead of left as a dangling `in_progress` row (and so it no longer shows up as the "active" log on a later revisit).
- "Complete Workout" is unchanged in that it still filters by `completedExercises` — but that array is now backed by the server, so it reflects reality even after a reload (closing the "Complete Workout uses persisted state" requirement).
- XP-once guard: see BUG-012 above (atomic transition + `xpAwarded` flag).

**Verified via:** `e2e/exercise-check-and-checklist.spec.ts` → `Workout checklist persistence & XP-once guard` describe block:
1. Starts a real workout via the API, toggles exercise 0's checklist item, re-fetches `/api/tracking/logs/active` fresh (simulating a reload) and confirms the toggle survived.
2. Reloads the actual `/my-fitness` **UI** and confirms the checkbox renders checked (not just an API-level check).
3. Completes the workout, confirms `gamification.xp` increases by exactly `xpAwarded`.
4. Calls complete **again** on the same log id, confirms `400 "Workout already completed"` and that `xp` did **not** change a second time.
5. A separate test confirms `Cancel` (`PATCH { status: 'skipped' }`) removes the log from `/api/tracking/logs/active`.

## Open / known limitations

| ID | Severity | Repro | Expected | Actual | Notes |
|----|----------|-------|----------|--------|-------|
| BUG-005 | Low | `GET /api/auth/oauth/google` without Google OAuth env | Redirect or disabled message | 503 | Documented; configure `GOOGLE_*` for production. |
| BUG-006 | Info | Basic plan users send multiple trainer connection requests | Product-defined limit behavior | `freeChatsUsed` increments on each new request | **Product decision** — confirm whether pending requests should count toward the 5-trainer cap. |
| BUG-007 | Info | Rate limiting on Vercel serverless | Per-instance limits | In-memory `rate-limit` resets per cold start | **Known limitation** — document only; use Redis/KV for strict production limits. |
| BUG-008 | Info | Merge `git merge main` on workstation | Fast-forward or merge commit from integration `main` | `fatal: refusing to merge unrelated histories` for **local** `main` | Integrated via `fyp-final/main` instead (shared history with `musadiq`). Local `main` branch is a separate lineage. |

## E2E journey notes

| Journey | Result |
|---------|--------|
| Landing `/` | 200 (live-verify) |
| Auth signup/login/reset | PASS |
| `/coaching` + `/api/trainers` | PASS |
| `/leaderboard` | Dedicated route exists; **does not** redirect to `/community` — it's a standalone page (`src/app/(dashboard)/leaderboard/page.tsx`) fetching `/api/gamification/leaderboard`. Community only embeds a link/mini-widget pointing at it. Confirmed via Playwright, not just source reading. |
| Trainer `ali@test.com` / `Trainer@123` | Login + profile + pending-requests PASS in live-verify |
| `/my-fitness`, `/analytics`, settings tabs | Pages included in live-verify page sweep (user1 session) |
| Google OAuth | 503 without credentials (expected) |

### Full Playwright browser run (this session, real Chromium via `npx playwright test`)

Ran against a real `next dev` server on `localhost:3000` with the live Atlas database (not mocked), after the slug backfill:

- `e2e/final-complete.spec.ts` — **38 tests, 35 passed clean + 3 flaky-then-passed (0 failed)**, 13.8m. The 3 flaky tests (admin login redirect, trainer login redirect, exercises API) failed only on their *first* attempt due to Next.js dev-mode cold-compile latency on the very first hit of `/login` and `/api/exercises`; all passed on Playwright's automatic retry. No app bug.
- `e2e/full-audit.spec.ts` — **20/20 passed**, 3.5m.
- Ad-hoc targeted check: coaching list cards render real `<a href="/coaching/{slug}">` links for every trainer (`ali-hassan`, `sarah-khan`, `usman-malik`, …) — confirms the slug migration is live end-to-end in the browser, not just in source.
- Manually verified `/coaching/<ObjectId>` in a browser context: Next.js emits the documented streaming `<meta http-equiv="refresh">` redirect to `/coaching/<slug>` (this Next.js version serves `permanentRedirect()` as a client meta-refresh instead of a raw HTTP 308 when the response is streamed — see `node_modules/next/dist/docs/.../permanentRedirect.md`). Real browsers follow it correctly; a non-JS HTTP client (`curl`) sees `200` with the meta tag in the body rather than a `Location` header. Documenting this as expected framework behavior for this Next.js version, not a bug — flag it if search-engine-crawlable 301s are a hard requirement.

## Re-verification — independent follow-up session (2026-07-29, later same day)

Ran as a fresh, single-session audit against the current `musadiq` working tree (no other concurrent session this time):

- Confirmed the BUG-004 DNS fix (`toDirectMongoUri()`) and the slug-or-id relationship-request fix are present in the working tree (diffed against `HEAD`, clean).
- `node scripts/backfill-trainer-slugs.mjs` → `Done. Backfilled 0 trainer slug(s).` (all trainers already had slugs from the prior run — confirms idempotency and that the DNS fix still works).
- `npm run build` → succeeded, `/coaching/[slug]` present in route output, no type errors.
- Re-audited all trainer id/slug lookups across `src/app/api/**` (trainers, reviews, availability, relationships/request) — all public-facing routes resolve slug-or-ObjectId via `src/lib/resolve-trainer.ts`; only admin/gym-owner-internal routes remain strict-ObjectId, which is correct since those always receive an internal `_id` from an already-scoped list, never a public URL param.
- Re-ran the full Playwright suite from scratch with a clean dev server (not reusing any prior instance): `e2e/full-audit.spec.ts` **20/20 passed** (4.4m), `e2e/final-complete.spec.ts` **38/38 passed** (7.8m) — this run had **zero flaky retries**, unlike the earlier session's 3 first-attempt cold-compile flakes.
- Reverted an incidental `next-env.d.ts` diff produced by `npm run build` (Next.js regenerates this file's `.next/dev/...` vs `.next/...` import path depending on whether the last build was `dev` or `build`) — not committed, per policy.

## Verification checklist (post-fix)

- [x] `npm run build`
- [x] `npm run backfill-trainer-slugs` (fixed DNS SRV workaround — see BUG-004; backfilled 10/10 trainers)
- [x] `/coaching/[slug]` in build output
- [x] Old ObjectId URLs → `permanentRedirect` to slug when trainer has `slug` (verified in real browser via Playwright)
- [x] `POST /api/relationships/request/[trainerId]` resolves slug or ObjectId (`findTrainerByIdOrSlug`)
- [x] Full Playwright E2E suite (58/58 effective passes across both spec files)

## Re-verification — Form Checker / Gating / Checklist session (2026-07-29, later)

- `npm run build` → succeeded (webpack), all routes compiled including the two new API routes (`/api/tracking/logs/[id]`, `/api/tracking/logs/active`), no TypeScript errors.
- Added `e2e/exercise-check-and-checklist.spec.ts` (6 tests): Basic-plan UI gate, Basic-plan API 403, Pro-plan UI unlock, Pro-plan API 200+XP, checklist persistence + XP-once guard (API + real UI reload check), cancel-clears-active-log.
- **First full Playwright run** (`e2e/exercise-check-and-checklist.spec.ts` + `e2e/final-complete.spec.ts` + `e2e/full-audit.spec.ts`, 64 tests total): 9 failures, all in `final-complete.spec.ts`, all `TimeoutError: page.waitForResponse ... /api/auth/login` (or a page that depends on that same login helper) — none in the new spec file, and none touching code changed in this session (login/settings/leaderboard/community/notifications pages were not modified). Consistent with this repo's previously-documented dev-server/network flakiness (see "Session notes — concurrent-agent race" above and the earlier "3 flaky-then-passed" note) rather than a regression.
- **Second full Playwright run**, fresh dev server, no other change: **64/64 passed**, 12.7m, zero retries needed. Confirms the first run's failures were transient environment flakiness, not caused by this session's code changes.
- Gating and checklist scenarios were exercised both at the API level (via `request` fixtures hitting real routes against the live dev DB) and via real browser UI navigation/reload (Playwright `page` fixture) — not just source-code review.

## Honest limitations of this verification pass

- All Playwright runs used the **simulated** subscription upgrade path (`POST /api/subscription`), not a real Stripe checkout — Stripe itself was not exercised in these tests (consistent with `STRIPE_SECRET_KEY` not being configured for local/dev testing per `src/app/api/subscription/route.ts`).
- The AI Form Checker's pose-estimation *accuracy* (as opposed to the plan-gating and XP wiring around it) could not be tested by this agent — no camera is available in this environment. See `FORM_CHECKER_AUDIT.md` §12.7 for the detailed camera/lighting/limitations write-up and what a human tester should verify.
- Test data (the "Checklist Persistence Test Plan" / "Cancel Test Plan" `WorkoutPlan` documents and their `WorkoutLog`s created by the new e2e spec) is left in the shared dev database, consistent with how existing specs already leave behind test signups/plans — no cleanup step existed previously and none was added here.
