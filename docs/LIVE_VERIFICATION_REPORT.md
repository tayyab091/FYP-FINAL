# Live Verification Report

**Date:** 2026-07-13 (Phase 1–3 re-verify)  
**Branch:** `musadiq`  
**Runtime:** `npm run dev` (Next.js 16.2.10) on `http://localhost:3000`  
**Database:** MongoDB Atlas (`mongodb+srv://…`) — connected after DNS SRV workaround  
**Method:** `npm run live-verify` (`scripts/live-verify.mjs`); HTTP API probes + authenticated page fetches  
**Payments:** **PAUSED — out of scope** (Stripe checkout / webhooks not exercised; plan fields read-only for gating)

## Environment inventory

| Variable | In `.env.local` | Notes |
|----------|-----------------|-------|
| `MONGODB_URI` | ✅ Set (Atlas) | Required. Windows ISP DNS refused `querySrv`; app resolves SRV via Google DNS then connects with a direct `mongodb://` URI |
| `JWT_SECRET` | ✅ Set | Required |
| `NEXT_PUBLIC_APP_URL` | ✅ Set | |
| `ADMIN_SETUP_KEY` | ✅ Set | Seed / admin setup |
| `GEMINI_API_KEY` / `SPOONACULAR_API_KEY` | Placeholder | Nutrition falls back to local DB |
| `STRIPE_*` | Placeholder | **PAUSED** — simulated path when unset/non-live |
| `PUSHER_*` / `NEXT_PUBLIC_PUSHER_*` | ❌ Missing | Realtime push N/A; REST poll works |
| `DAILY_API_KEY` | ❌ Missing | Live session **create** returns 503 |
| `BLOB_READ_WRITE_TOKEN` | ❌ Missing | Chat image upload returns 503 |
| `SMTP_*` | ❌ Missing | Forgot-password / verify return `devLink` in development |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ❌ Missing | OAuth start returns 503 |

## Seed / demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@test.com` | `Admin@123` |
| Gym owner | `gymowner@test.com` | `GymOwner@123` |
| Trainer | `ali@test.com` | `Trainer@123` |
| User (Pro) | `user1@test.com` | `User@123` |
| User (Basic) | `user2@test.com` | `User@123` |
| User (Elite) | `user3@test.com` | `User@123` |

## Feature-by-feature results

Legend: ✅ working · ⚠️ partial / env-gated · ❌ broken · 🧩 newly wired this session · ⏸️ payments paused

| Feature | Status | What was verified | Notes |
|---------|--------|-------------------|-------|
| Health / Mongo | ✅ | `GET /api/health` | `database: connected` |
| Signup / login / me | ✅ | register + login + me | JWT httpOnly cookie |
| Password reset | ✅🧩 | forgot → `devLink` → reset | SMTP unset → console + API `devLink` in non-prod; UI shows link |
| Email verify | ✅ | register logs verify `devLink` | Routes `/verify-email` + API exist |
| Google OAuth | ⚠️ | start → 503 without secrets | Code: CSRF `state`, `googleId` linking, role redirect |
| Homepage | ✅ | `GET /` | Transient Turbopack/sonner cache 500 cleared via `.next` wipe |
| Role dashboards | ✅ | trainer / gym / admin APIs | |
| Coaching / trainers | ✅ | `GET /api/trainers` | Atlas trainers |
| Trainer reviews | ✅🧩 | GET reviews | Notification link fixed → `/coaching/[id]` |
| Chat list / send / typing | ✅ | messages POST + typing | Pusher optional |
| Chat image (Blob) | ⚠️ | upload without file → 503 | Needs `BLOB_READ_WRITE_TOKEN` |
| Pusher realtime | ⚠️ | auth → 503 | Needs Pusher keys; REST poll fallback OK |
| Notifications center | ✅🧩 | list + community triggers | Like/comment notify author; live-session notify Elite clients |
| Nutrition catalog | ✅ | meals + analyze GET | |
| `/nutrition/[id]` | ✅ | detail page 200 | |
| `/exercises/[id]` | ✅ | detail page 200 | |
| Progress / my-fitness | ✅ | progress + pages | |
| Workout plans | ✅ | member 403 on trainer list; my-plan 200 | Expected |
| Meal plans (Pro) | ✅ | GET + POST generate 201 | |
| Analytics (Pro) | ✅ | summary 200 | |
| Community feed | ✅🧩 | post / like / comment | Notifications fired |
| Live sessions | ⚠️ | list OK; member create 403; trainer create 503 | Elite join gated by plan; Daily required to create |
| Subscription / payments | ⏸️ | GET plan fields only | **PAUSED — out of scope** (Stripe simulated/test; JazzCash planned not started) |
| Edge route guards | ✅ | `src/proxy.ts` only (no `middleware.ts`) | jose JWT; protected/guest/role routes |
| Gamification | ✅ | `/api/gamification/me` | |

## Summary counts (latest scripted run)

- **69 pass / 0 fail / 69 total** (`npm run live-verify`)
- Env-gated expected 503s counted as pass: OAuth, Blob upload, Pusher auth, Daily create

## Cannot fully verify without secrets

- Realtime push (Pusher)
- Live video room create (Daily.co)
- Chat image Blob uploads
- Google OAuth end-to-end (needs Console credentials)
- SMTP-delivered emails (dev `devLink` verified instead)
- Real Stripe Checkout — **PAUSED**

## Fixes applied this session

1. Review notification deep-link → `/coaching/[id]`
2. Community like/comment → `createNotification` (type `community`)
3. Live session create → notify Elite active clients
4. Google OAuth: `googleId` + `authProviders`, CSRF `state` cookie, role-based redirect
5. Forgot-password / register: return + show `devLink` when SMTP unset (non-production)
6. Extended `scripts/live-verify.mjs` + `npm run live-verify`
