# Live Verification Report

**Date:** 2026-07-13  
**Branch:** `musadiq`  
**Runtime:** `npm run dev` (Next.js 16.2.10) on `http://localhost:3000`  
**Database:** MongoDB Atlas (`mongodb+srv://…`) — connected after DNS SRV workaround  
**Method:** HTTP API probes + authenticated page fetches (`scripts/live-verify.mjs`); no browser MCP available  

## Environment inventory

| Variable | In `.env.local` | Notes |
|----------|-----------------|-------|
| `MONGODB_URI` | Set (Atlas) | Required. Windows ISP DNS refused `querySrv`; app resolves SRV via Google DNS (`8.8.8.8`) then connects with a direct `mongodb://` URI |
| `JWT_SECRET` | Set | Required |
| `NEXT_PUBLIC_APP_URL` | Set | |
| `ADMIN_SETUP_KEY` | Set | Seed / admin setup |
| `GEMINI_API_KEY` | Set | AI features |
| `SPOONACULAR_API_KEY` | Set | Nutrition search (falls back to local DB) |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Set | Runtime reported `stripeEnabled: false` (treated as placeholders / not live) → simulated checkout path |
| `ALLOW_DATABASE_SEEDING` | Missing | Not required in `development` |
| `ALLOW_ADMIN_SETUP` | Missing | Optional |
| `PUSHER_*` / `NEXT_PUBLIC_PUSHER_*` | Missing | Realtime push unavailable; REST poll fallback works |
| `DAILY_API_KEY` | Missing | Live session **create** returns 503 |
| `BLOB_READ_WRITE_TOKEN` | Missing | Chat image upload returns 503 |
| `SMTP_*` | Missing | Forgot-password returns 200 and logs link (dev fallback) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Missing | OAuth start returns 503 |
| Local MongoDB `:27017` | Not running | Atlas used instead |
| Docker | Not installed | N/A |

## Seed / demo accounts (Atlas already seeded)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@test.com` | `Admin@123` |
| Gym owner | `gymowner@test.com` | `GymOwner@123` |
| Trainer | `ali@test.com` | `Trainer@123` |
| User (Pro) | `user1@test.com` | `User@123` |
| User (Basic) | `user2@test.com` | `User@123` |
| User (Elite) | `user3@test.com` | `User@123` |

## Feature-by-feature results

| Feature | Status | What was called / clicked | Expected | Actual | DB / notes |
|---------|--------|---------------------------|----------|--------|------------|
| Health / Mongo | **Working** | `GET /api/health` | 200 + `database: connected` | 200 connected | Atlas ping OK via direct URI |
| Signup | **Working** | `POST /api/auth/register` (`verify_*@test.com`) | 201 | 201 | User document created |
| Login | **Working** | `POST /api/auth/login` (all roles) | 200 + httpOnly cookie | 200 | JWT cookie set |
| Auth me / logout | **Working** | `GET /api/auth/me`, `POST /api/auth/logout` | 200 | 200 | |
| Password reset | **Working (dev)** | `POST /api/auth/forgot-password` | 200 | 200 | SMTP unset → console/dev link path |
| Email verify | **Partial** | Routes exist (`/verify-email`, API) | Token flow | Not fully exercised end-to-end without email | |
| Google OAuth | **Cannot run — missing X** | `GET /api/auth/oauth/google` | Redirect to Google | **503** | Missing `GOOGLE_CLIENT_ID` / `SECRET` |
| User dashboard (home) | **Working** | `GET /` as user1 | 200 HTML | 200 | No longer pulls Mongoose into client bundle |
| Trainer dashboard APIs | **Working** | login trainer → profile, pending requests, plans list | 200 | 200 | |
| Gym owner | **Working** | `GET /api/gym-owner/gym`, `/trainers` | 200 | 200 | FitZone Lahore present |
| Admin | **Working** | `GET /api/admin/stats`, `/users` | 200 | 200 | |
| Coaching / trainers | **Working** | `GET /api/trainers` | DB trainers | 200 real trainers (not fallback) | Confirmed in Atlas |
| Reviews | **Working** | `GET /api/trainers/:id/reviews` | 200 | 200 | |
| Chat list / send / typing | **Working** | conversations + messages POST + typing | 200/201 | Pass | Message persisted; Pusher optional |
| Chat image upload | **Cannot run — missing X** | `POST /api/chat/upload` | Upload URL | **503** | Needs `BLOB_READ_WRITE_TOKEN` |
| Notifications | **Working** | `GET /api/notifications` | List | 200 with chat notifications | Pusher push N/A without keys |
| Nutrition catalog | **Working** | `GET /api/meals`, meal-logs today | 200 | 200 | |
| Nutrition analyze | **Working** | `GET /api/nutrition/analyze?query=chicken` | Results | 200 local DB results | POST returns 405 (GET-only by design) |
| Progress metrics | **Working** | `GET /api/tracking/progress` | Records | 200 (weight 72.5 logged) | UI lives under `/my-fitness` (not `/progress`) |
| Workout plans (trainer) | **Working** | trainer `GET /api/tracking/plans` | List | 200 | User gets 403 (trainers-only) — expected |
| My plan (member) | **Working** | `GET /api/tracking/plans/my-plan` | Active plan | 200 | |
| Subscription | **Working (simulated)** | `GET` + `POST /api/subscription` | Checkout or simulated | `stripeEnabled: false`, `mode: simulated` | Stripe keys present but not treated as live |
| Meal plans | **Working** | `GET` + `POST /api/meal-plans` as Pro | List / generate | 200 / **201** | Generated successfully |
| Community | **Working** | `GET` + `POST /api/community/posts` | Feed / create | 200 / **201** | Post created |
| Analytics | **Working** | `GET /api/analytics/summary` as Pro | Charts/summary | 200 | workoutCount, calories, weight trend |
| Live sessions list | **Working** | `GET /api/live-sessions` | List | 200 `[]` | |
| Live session create | **Cannot run — missing X** | trainer `POST /api/live-sessions` | 201 | **503** `DAILY_API_KEY` required | Elite member create correctly **403** (trainer-only) |
| Exercise catalog / check page | **Working** | `GET /api/exercises`, `GET /exercise-check` | 200 | 200 | Form-check gated by plan in API |
| Gamification | **Working** | `GET /api/gamification/me` | XP/achievements | 200 | |
| Pages (auth-gated) | **Working** | `/chat`, `/meal-plans`, `/community`, `/analytics`, `/live-sessions`, `/notifications`, `/my-fitness`, `/subscription`, `/coaching`, `/nutrition` | 200 | 200 | |
| Legacy paths `/progress`, `/workout-plans` | **Redirected** | Previously 404 | Soft redirect → `/my-fitness` | Added in `next.config.ts` | |

## Blockers fixed during Phase 0

1. **Atlas `querySrv ECONNREFUSED`** on Windows — `src/lib/mongodb.ts` resolves SRV with an explicit Google DNS `Resolver`, then connects with a non-SRV URI; failed promises are not cached forever.  
2. **Next.js crashed** when both `src/middleware.ts` and `src/proxy.ts` existed — removed `middleware.ts` (keep Edge `proxy.ts` only).  
3. **Homepage / client 500** — `subscription.ts` imported Mongoose `User`; split server ops into `subscription-server.ts` and moved gamification types to `src/types/gamification.ts`.  
4. **Turbopack wrong root** (parent `C:\Users\al rafio\package-lock.json`) — set `turbopack.root` to project directory in `next.config.ts`.

## Summary counts (scripted run)

- **54 pass / 4 fail / 58 total** on first full script (failures were expectation mismatches: trainer-only plans 403, nutrition POST 405, legacy page 404s).  
- After correcting expectations + redirects: core product paths verified working against live Atlas data.

## Cannot fully verify without secrets

- Realtime push (Pusher)  
- Live video rooms (Daily.co)  
- Chat image Blob uploads  
- Google OAuth  
- Real Stripe Checkout (keys appear non-live → simulated)  
- SMTP-delivered password reset / verify emails  
