# Live Verification Report

**Date:** 2026-07-13 (Phase 1–3 security re-verify)  
**Branch:** `musadiq`  
**Runtime:** `npm run dev` (Next.js 16.2.10) on `http://localhost:3000`  
**Database:** MongoDB Atlas (`mongodb+srv://…`) — connected after DNS SRV workaround  
**Method:** `npm run live-verify` (`scripts/live-verify.mjs`); HTTP API probes + authenticated page fetches + security probes  
**Payments:** **PAUSED — out of scope** (Stripe checkout / webhooks not exercised; plan fields read-only for gating)

## Environment inventory

| Variable | In `.env.local` | Notes |
|----------|-----------------|-------|
| `MONGODB_URI` | ✅ Set (Atlas) | Required. Windows ISP DNS refused `querySrv`; app resolves SRV via Google DNS then connects with a direct `mongodb://` URI |
| `JWT_SECRET` | ✅ Set | Required |
| `NEXT_PUBLIC_APP_URL` | ✅ Set | Used for CORS allow-origin |
| `ADMIN_SETUP_KEY` | ✅ Set | Seed / admin setup |
| `GEMINI_API_KEY` / `SPOONACULAR_API_KEY` | Placeholder | Nutrition falls back to local DB |
| `STRIPE_*` | Placeholder | **PAUSED** — simulated path when unset/non-live |
| `PUSHER_*` / `NEXT_PUBLIC_PUSHER_*` | ❌ Missing | Realtime push N/A; REST poll works |
| No Jitsi env vars | n/a | Live session create should work without extra secrets |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Optional | Chat image upload depends on Cloudinary config |
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

Legend: ✅ working · ⚠️ partial / env-gated · ❌ broken · 🧩 newly wired · ⏸️ payments paused · 🔒 security hardened

| Feature | Status | What was verified | Notes |
|---------|--------|-------------------|-------|
| Health / Mongo | ✅ | `GET /api/health` | `database: connected` |
| Signup / login / me | ✅🔒 | register + login + me | Zod + rate limit; NoSQL operator login rejected |
| Password reset | ✅🔒 | forgot → `devLink` → reset | Zod + rate limit |
| Email verify | ✅🔒 | register logs verify `devLink` | Zod token body |
| Google OAuth | ⚠️ | start → 503 without secrets | Code: CSRF `state`, `googleId` linking |
| Homepage | ✅🔒 | `GET /` | CSP + security headers present |
| Role dashboards | ✅ | trainer / gym / admin APIs | |
| Coaching / trainers | ✅ | `GET /api/trainers` | |
| Trainer reviews | ✅🔒 | GET/POST reviews | Zod rating/comment sanitize |
| Chat list / send / typing | ✅🔒 | messages POST + typing | ObjectId + sanitized text; https-only images |
| Chat image (Cloudinary) | ⚠️🔒 | upload without file / env → 400 or 503 | MIME/size + rate limit; needs Cloudinary keys |
| Pusher realtime | ⚠️ | auth → 503 | Needs Pusher keys; REST poll fallback OK |
| Notifications center | ✅ | list + community triggers | |
| Nutrition catalog | ✅🔒 | meals + analyze GET | Query Zod-sanitized |
| `/nutrition/[id]` | ✅ | detail page 200 | |
| `/exercises/[id]` | ✅ | detail page 200 | |
| Progress / my-fitness | ✅🔒 | progress POST Zod | |
| Workout plans | ✅🔒 | member 403 on trainer list; my-plan 200 | Plan create Zod + ownership |
| Meal plans (Pro) | ✅🔒 | GET + POST generate 201 | Zod body |
| Analytics (Pro) | ✅ | summary 200 | |
| Community feed | ✅🔒 | post / like / comment | HTML stripped server-side |
| Live sessions | ✅🔒 | list/create/join with trainer + elite gating | Create body Zod; Jitsi embed via `meet.jit.si` |
| Subscription / payments | ⏸️ | GET plan fields only | **PAUSED — out of scope** |
| Edge route guards | ✅ | `src/proxy.ts` only | jose JWT |
| Gamification | ✅🔒 | `/api/gamification/me`; form-check Zod + rate limit | |
| AI chat | ✅🔒 | auth + Zod + rate limit | Not in live-verify script |
| CSP / headers | ✅🔒 | CSP, nosniff, frame options | Via `next.config.ts` |

## Security probes (this session)

| Probe | Result |
|-------|--------|
| Login `email: {$ne: null}` | **400** — operator rejected |
| Register operator email | **400** |
| Community `<script>` / `<img onerror>` | Stored as plain text (tags stripped) |
| Profile `profileImage: javascript:…` | **400** |
| CSP on `/` | Present |

## Summary counts (latest scripted run)

- **69 pass / 0 fail / 69 total** (`npm run live-verify`)
- `npm run build` — success
- Env-gated expected 503s counted as pass: OAuth, Cloudinary upload, Pusher auth

## Cannot fully verify without secrets

- Realtime push (Pusher)
- Chat image Cloudinary uploads
- Google OAuth end-to-end
- SMTP-delivered emails (dev `devLink` verified instead)
- Real Stripe Checkout — **PAUSED**

## Fixes applied this session (security)

1. Zod + NoSQL operator rejection across mutating APIs  
2. Plain-text / URL sanitization for UGC  
3. CSP and related security headers; tighter CORS origin  
4. Rate limits on auth, AI, and upload routes  
5. AI chat requires authentication  
6. Chat UI blocks non-https image URLs  

See `docs/SECURITY_AUDIT_REPORT.md`.
