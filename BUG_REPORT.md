# T.E.S.T. — Bug Report (2026-07-29)

Live verification: `npm run dev` + `npm run live-verify` (partial run; long AI steps may delay completion). Production build: `npm run build` passes after slug migration.

## Fixed in this session

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| BUG-001 | High | Public trainer URLs used MongoDB ObjectIds (`/coaching/[id]`) | Trainer `slug` field, `/coaching/[slug]`, API lookup by slug or id, 301 from ObjectId URLs |
| BUG-002 | High | `trainer-slug.ts` pulled Mongoose into client bundle (build failed) | Split `trainer-slug.ts` (client) vs `trainer-slug-server.ts` (DB) |
| BUG-003 | Low | Delete account fetch omitted explicit `credentials` | Added `credentials: 'include'` on settings delete |

## Open / known limitations

| ID | Severity | Repro | Expected | Actual | Notes |
|----|----------|-------|----------|--------|-------|
| BUG-004 | Medium | `npm run backfill-trainer-slugs` without Atlas reachability | All trainers get `slug` | `querySrv ECONNREFUSED` | Run backfill where `MONGODB_URI` resolves (CI/deploy or local VPN). New registrations get slugs automatically. |
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
| `/leaderboard` | Dedicated route exists; community embeds mini leaderboard + link to `/leaderboard` |
| Trainer `ali@test.com` / `Trainer@123` | Login + profile + pending-requests PASS in live-verify |
| `/my-fitness`, `/analytics`, settings tabs | Pages included in live-verify page sweep (user1 session) |
| Google OAuth | 503 without credentials (expected) |

## Verification checklist (post-fix)

- [x] `npm run build`
- [ ] `npm run backfill-trainer-slugs` (requires MongoDB network)
- [x] `/coaching/[slug]` in build output
- [x] Old ObjectId URLs → `permanentRedirect` to slug when trainer has `slug`
