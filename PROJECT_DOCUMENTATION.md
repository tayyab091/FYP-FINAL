# T.E.S.T. — Project Documentation

**Train. Eat. Sweat. Transform.** — a multi-role fitness platform (Final Year Project).

| Item | Value |
|------|--------|
| Stack | Next.js 16 (App Router), React 19, MongoDB/Mongoose, Tailwind 4 |
| Branch of record | `musadiq` → remote `fyp-final` (`https://github.com/tayyab091/FYP-FINAL`) |
| Deploy target | **Vercel** (serverless) — no long-lived Socket.io / custom WebRTC / local disk uploads |
| Local start | `npm install` → copy `.env.example` → `.env.local` → `npm run dev` |

---

## 1. Overview

T.E.S.T. connects members, verified trainers, gym owners, and admins:

- Members track workouts, nutrition, progress, and chat with trainers  
- Trainers manage clients, assign plans, and (with Daily.co) host live sessions  
- Gym owners manage gym profiles and affiliated trainers  
- Admins verify trainers/gyms and oversee users  

Monetization uses three plans: **Basic** (free), **Pro**, **Elite**, with server-side entitlement checks.

---

## 2. Architecture

```
Browser (React client)
   │  JWT httpOnly cookie
   ▼
Edge proxy.ts (jose JWT) ── redirects for protected / guest / role routes
   ▼
Next.js Route Handlers (Node) ── Mongoose ── MongoDB Atlas
   │
   ├── Pusher (optional) ── private chat + notification channels
   ├── Daily.co (optional) ── live video rooms
   ├── Vercel Blob (optional) ── chat images
   ├── Stripe (optional) ── Checkout; simulated upgrade when unset
   ├── SMTP (optional) ── password reset / verify email
   └── Gemini / Spoonacular (optional) ── AI coach / food search
```

**Vercel constraints (already applied):**

| Need | Not used | Used instead |
|------|----------|--------------|
| Realtime chat | Socket.io custom server | **Pusher** (+ REST poll fallback) |
| Live video | Homegrown WebRTC | **Daily.co** |
| Image uploads | Local `fs` / `public/uploads` | **Vercel Blob** |
| Edge auth | Node `jsonwebtoken` / fs | **`jose` in `proxy.ts`** |

Prefer `npm run dev` (`next dev`). `npm run dev:custom` (`tsx server.ts`) is a legacy/custom entry and is not required for Vercel.

---

## 3. Data model (MongoDB)

| Collection / model | Purpose |
|--------------------|---------|
| `User` | Accounts, roles, subscription, reset/verify tokens |
| `Trainer` | Public trainer profile, verification, gym link |
| `Gym` | Gym owner entity + verification |
| `Relationship` | Member↔trainer coaching request lifecycle |
| `Conversation` / `Message` | 1:1 chat (text/image types) |
| `WorkoutPlan` / `WorkoutLog` | Plans + completion logs |
| `MealLog` / `MealPlan` | Daily nutrition + generated meal plans |
| `ProgressRecord` | Weight / body metrics |
| `Notification` | In-app notifications |
| `Review` | Trainer ratings |
| `CommunityPost` / `CommunityComment` | Social feed |
| `LiveSession` | Scheduled sessions + Daily room metadata |
| `GamificationProfile` | XP, streaks, achievements |
| `AuditLog` | Admin actions |

**User roles:** `user` | `trainer` | `gym_owner` | `admin` | `super_admin`  
**Plans:** `basic` | `pro` | `elite` (with optional `endDate` for paid)

---

## 4. Features & plan gates

Enforcement lives in `src/lib/subscription.ts` (+ `subscription-server.ts` for DB sync) and `src/lib/access.ts`.

| Feature | Basic | Pro | Elite |
|---------|-------|-----|-------|
| Community | ✓ | ✓ | ✓ |
| Workouts / week | 3 | ∞ | ∞ |
| Trainer connections | 5 | ∞ | ∞ |
| Meal plans | — | ✓ | ✓ |
| Analytics | — | ✓ | ✓ |
| AI form check | — | ✓ | ✓ |
| Live sessions (join) | — | — | ✓ |
| Live sessions (create) | Trainer role + Daily.co | | |

Privileged roles (admin / trainer / gym_owner) bypass member subscription gates where noted in code.

---

## 5. Main UI routes

| Path | Audience |
|------|----------|
| `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` | Public / auth |
| `/register-trainer`, `/register-gym-owner` | Onboarding |
| `/coaching`, `/nutrition`, `/exercises`, `/exercise-check`, `/subscription` | Catalog / marketing / gated tools |
| `/my-fitness` | Member hub (progress, plan, gamification) |
| `/chat`, `/notifications` | Messaging |
| `/meal-plans`, `/community`, `/analytics`, `/live-sessions` | Plan-gated member features |
| `/trainer-dashboard`, `/gym-owner`, `/admin` | Role dashboards |
| `/progress`, `/workout-plans` | Redirect → `/my-fitness` |
| `/pricing` | Redirect → `/subscription` |

---

## 6. API routes (summary)

### Auth & user
`/api/auth/register`, `register-trainer`, `register-gym-owner`, `login`, `logout`, `me`, `forgot-password`, `reset-password`, `verify-email`, `oauth/google`, `oauth/google/callback`, `create-admin`  
`/api/user/profile`, `/api/user/change-password`

### Coaching & social
`/api/trainers`, `/api/trainers/[id]`, `/api/trainers/[id]/reviews`, `/api/trainers/profile`, `/api/trainers/clients/[userId]/progress`  
`/api/relationships`, `request/[trainerId]`, `pending-requests`, `[id]/accept|reject`  
`/api/community/posts`, `[id]/like`, `[id]/comments`

### Chat & realtime
`/api/chat/conversations`, `[id]`, `[id]/messages`, `[id]/typing`, `/api/chat/upload`  
`/api/pusher/auth`  
`/api/notifications`, `[id]/read`, `mark-all-read`

### Tracking & content
`/api/tracking/plans`, `my-plan`, `[id]/activate`, `/api/tracking/logs`, `[id]/complete`, `/api/tracking/progress`, `/api/tracking/meal-logs/today`  
`/api/meals`, `/api/nutrition/analyze`, `/api/exercises`, `/api/meal-plans`, `/api/meal-plans/[id]`  
`/api/analytics/summary`, `/api/gamification/me`, `/api/gamification/form-check`  
`/api/ai/chat`

### Live & billing
`/api/live-sessions`, `[id]`, `[id]/join`  
`/api/subscription`, `/api/subscription/confirm`, `/api/webhooks/stripe`

### Ops
`/api/health`, `/api/seed`, `/api/admin/*`, `/api/gym-owner/*`

---

## 7. Environment variables

See `.env.example`. Minimum to run locally:

```env
MONGODB_URI=...
JWT_SECRET=...
```

| Variable | Required? | Effect if missing |
|----------|-----------|-------------------|
| `MONGODB_URI` | **Yes** | App cannot start meaningfully |
| `JWT_SECRET` | **Yes** | Auth / proxy fail |
| `ADMIN_SETUP_KEY` | Dev seed | Seed / create-admin blocked |
| `PUSHER_*` + `NEXT_PUBLIC_PUSHER_*` | Optional | Chat/notifications poll instead of push |
| `DAILY_API_KEY` | Optional | Live session create returns 503 |
| `BLOB_READ_WRITE_TOKEN` | Optional | Chat image upload 503 |
| `STRIPE_*` | Optional | Simulated checkout (`PUT` with `simulatedPayment: true` only when Stripe unset) |
| `SMTP_*` | Optional | Reset/verify links logged in development |
| `GOOGLE_CLIENT_*` | Optional | OAuth returns 503 |
| `GEMINI_API_KEY` / `SPOONACULAR_API_KEY` | Optional | AI / food search degrade gracefully |

**Windows note:** Some ISP DNS resolvers refuse MongoDB SRV (`querySrv ECONNREFUSED`). `src/lib/mongodb.ts` resolves SRV via Google DNS and connects with a direct URI.

---

## 8. Local development

```bash
npm install
cp .env.example .env.local   # fill MONGODB_URI + JWT_SECRET
npm run dev
# optional seed (NODE_ENV=development):
curl -X POST http://localhost:3000/api/seed -H "Content-Type: application/json" -d "{\"setupKey\":\"YOUR_ADMIN_SETUP_KEY\"}"
```

Demo passwords after seed: see `docs/LIVE_VERIFICATION_REPORT.md`.

Verification helper: `node scripts/live-verify.mjs` (server must be running).

---

## 9. Known gaps & suggested next steps

**Gaps (env / product):**

1. Production realtime requires Pusher + Daily + Blob tokens on Vercel  
2. Google OAuth and SMTP need real credentials for production auth UX  
3. Stripe is one-time Checkout, not recurring Billing Subscriptions  
4. Live video create hard-requires Daily — cannot fully demo without key  

**Suggested next steps:**

1. Provision Pusher / Daily / Blob / SMTP / Google / live Stripe; document dashboard URLs in team wiki  
2. Add CI smoke tests against `/api/health` + login  
3. Consider MongoDB connection string with explicit hosts for CI Windows runners  
4. Remove or archive unused custom `server.ts` if fully replaced by Pusher  
5. Expand E2E (Playwright) for chat + plan upgrade happy paths  

---

## 10. Related docs

- `docs/LIVE_VERIFICATION_REPORT.md` — Phase 0 live probe results  
- `docs/AUDIT_REPORT.md` — Working / Partial / Cannot-run matrix  
- `docs/REALTIME_CHAT.md` — Pusher channel conventions  

---

*Generated for zero-context readers. Prefer live reports over assuming a file’s presence means a feature works.*
