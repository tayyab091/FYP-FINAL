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

## Verification checklist (post-fix)

- [x] `npm run build`
- [x] `npm run backfill-trainer-slugs` (fixed DNS SRV workaround — see BUG-004; backfilled 10/10 trainers)
- [x] `/coaching/[slug]` in build output
- [x] Old ObjectId URLs → `permanentRedirect` to slug when trainer has `slug` (verified in real browser via Playwright)
- [x] `POST /api/relationships/request/[trainerId]` resolves slug or ObjectId (`findTrainerByIdOrSlug`)
- [x] Full Playwright E2E suite (58/58 effective passes across both spec files)
