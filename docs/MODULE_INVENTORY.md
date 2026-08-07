# Module inventory (T.E.S.T.)

Last updated: 2026-07-29 (branch `musadiq` after merge + trainer slug migration).

## Merge state

| Source | Result |
|--------|--------|
| `fyp-final/main` → `musadiq` | Merge commit (integration main; Tayyab UI/admin commits included) |
| Local `tayyab` → `musadiq` | Already up to date after main merge |
| Local `main` → `musadiq` | **Skipped** — unrelated histories; use `fyp-final/main` as integration main |

## Trainer public profiles (slug)

| Piece | Location |
|-------|----------|
| Model field | `src/models/Trainer.ts` — `slug` (unique, sparse) |
| Client URL helper | `src/lib/trainer-slug.ts` — `trainerPublicPath()` |
| Server slug allocation | `src/lib/trainer-slug-server.ts` — `allocateTrainerSlug()` |
| Resolve id or slug | `src/lib/resolve-trainer.ts` |
| Public page | `src/app/(public)/coaching/[slug]/` |
| Legacy ObjectId URLs | Server `permanentRedirect` in `[slug]/page.tsx` |
| API GET trainer | `src/app/api/trainers/[id]/route.ts` (param accepts slug or ObjectId) |
| Reviews API | `src/app/api/trainers/[id]/reviews/route.ts` |
| Registration | `src/app/api/auth/register-trainer/route.ts` |
| Profile name change | `src/app/api/user/profile/route.ts` (regenerates slug on rename) |
| Backfill | `npm run backfill-trainer-slugs` → `scripts/backfill-trainer-slugs.mjs` |

## Core route modules

| Module | App routes | API prefix |
|--------|------------|------------|
| Auth | `/login`, `/signup`, `/register-trainer`, … | `/api/auth/*` |
| Coaching | `/coaching`, `/coaching/[slug]` | `/api/trainers/*`, `/api/relationships/*` |
| Chat | `/chat`, `/chat/[id]` | `/api/chat/*`, Pusher |
| Nutrition | `/nutrition`, `/meal-plans` | `/api/meals`, `/api/tracking/meal-logs/*` |
| My fitness | `/my-fitness` | `/api/tracking/*`, `/api/ai/generate-plan` |
| Gamification | `/leaderboard`, embed in `/community` | `/api/gamification/*` |
| Trainer dashboard | `/trainer-dashboard` | `/api/trainer/*`, `/api/tracking/plans` |
| Admin | `/admin` | `/api/admin/*` |
| Live sessions | `/live-sessions` | `/api/live-sessions/*` (Jitsi) |
