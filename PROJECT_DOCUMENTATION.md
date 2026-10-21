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
- Trainers manage clients, assign plans, and host live sessions on Jitsi Meet  
- Gym owners manage gym profiles and affiliated trainers  
- Admins verify trainers/gyms and oversee users  

Monetization uses three plans: **Basic** (free), **Pro**, **Elite**, with server-side entitlement checks.

**Payments status: PAUSED — out of scope for current work.** Stripe Checkout exists in code (simulated when keys unset / non-live). JazzCash is planned and **not started**. Do not treat payment checkout as verified.

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
   ├── Jitsi Meet (`meet.jit.si`) ── live video rooms
   ├── Cloudinary (optional) ── chat images
   ├── Stripe (optional) ── Checkout; simulated upgrade when unset
   ├── SMTP (optional) ── password reset / verify email
   └── Gemini / Spoonacular (optional) ── AI coach / food search
```

**Vercel constraints (already applied):**

| Need | Not used | Used instead |
|------|----------|--------------|
| Realtime chat | Socket.io custom server | **Pusher** (+ REST poll fallback) |
| Live video | Homegrown WebRTC | **Jitsi Meet** |
| Image uploads | Local `fs` / `public/uploads` | **Cloudinary** |
| Edge auth | Node `jsonwebtoken` / fs | **`jose` in `proxy.ts`** |

Prefer `npm run dev` (`next dev`). `npm run dev:custom` (`tsx server.ts`) is a legacy/custom entry and is not required for Vercel.

---

## 3. Data model (MongoDB)

| Collection / model | Purpose |
|--------------------|---------|
| `User` | Accounts, roles, subscription, reset/verify tokens |
| `Trainer` | Public trainer profile, verification, gym link, **unique `slug` for `/coaching/[slug]`** |
| `Gym` | Gym owner entity + verification |
| `Relationship` | Member↔trainer coaching request lifecycle |
| `Conversation` / `Message` | 1:1 chat (text/image types) |
| `WorkoutPlan` / `WorkoutLog` | Plans + completion logs |
| `MealLog` / `MealPlan` | Daily nutrition + generated meal plans |
| `ProgressRecord` | Weight / body metrics |
| `Notification` | In-app notifications |
| `Review` | Trainer ratings |
| `CommunityPost` / `CommunityComment` | Social feed |
| `LiveSession` | Scheduled sessions + meeting room metadata |
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
| Live sessions (create) | Trainer role + Jitsi Meet | | |

Privileged roles (admin / trainer / gym_owner) bypass member subscription gates where noted in code. Per-role routes, APIs, bypasses, and restrictions are detailed in §5.

---

## 5. Role features

Privileged platform roles beyond member and trainer flows. Enforcement lives in route handlers, `proxy.ts`, and `src/lib/access.ts`.

### Admin (`admin`)

| Area | Details |
|------|---------|
| **Home** | `/admin` (Admin Console) |
| **Tabs** | overview, users, trainers, gyms, verifications, audit, subscriptions |
| **Pages** | `/admin/exercises`, `/admin/nutrition` (read-only catalogs); `/settings` (Admin Controls tab) |
| **APIs** | All `/api/admin/*` — stats, users, suspend, trainer/gym verify, audit-logs, subscriptions |

**Subscription bypass:** analytics, meal plans, community, AI form checker.

**Live sessions:** treated as Elite for **join** only (hosting requires trainer role).

**Cannot:** trainer dashboard, gym-owner workspace, suspend other admins, change admin subscriptions.

### Super admin (`super_admin`)

Functionally **identical** to admin — no exclusive capabilities. Every authorization check uses `['admin', 'super_admin'].includes(role)`. Differences are cosmetic only (red badge vs purple, sidebar label). `super_admin` must be set manually in MongoDB; no API creates it.

### Gym owner (`gym_owner`)

| Area | Details |
|------|---------|
| **Home** | `/gym-owner` |
| **Tabs** | My Gym (profile edit), My Trainers (link by email, approve/remove), Analytics |
| **Pages** | `/gym-owner/exercises`, `/gym-owner/nutrition` (read-only); `/chat`; `/settings` (Facility tab) |
| **APIs** | `/api/gym-owner/gym` (GET/PUT), `/api/gym-owner/trainers` (GET/POST/PUT); register via `/api/auth/register-gym-owner` |

**Subscription bypass:** analytics, meal plans, community, form checker. **Not** live sessions — Elite plan required.

**Cannot:** admin console, trainer dashboard, member `/dashboard`, platform verification (admin only).

**Gym verification:** view status only; admin approves via `/api/admin/gyms/[id]/verify`.

### Role comparison

| Capability | Admin | Super admin | Gym owner |
|------------|:-----:|:-----------:|:---------:|
| Admin Console (`/admin`) | ✓ | ✓ | — |
| Suspend users (non-admin) | ✓ | ✓ | — |
| Suspend admins | — | — | — |
| Verify trainers / gyms | ✓ | ✓ | — |
| Manage subscriptions (non-admin) | ✓ | ✓ | — |
| Change admin subscriptions | — | — | — |
| Gym-owner workspace | — | — | ✓ |
| Trainer dashboard | — | — | — |
| Analytics / meal plans / community / form checker bypass | ✓ | ✓ | ✓ |
| Live sessions (join as Elite) | ✓ | ✓ | — (needs Elite) |
| Live sessions (host) | — (trainer only) | — | — |
| Distinct from admin beyond UI | — | cosmetic only | — |

---

## 6. Main UI routes

| Path | Audience |
|------|----------|
| `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` | Public / auth |
| `/register-trainer`, `/register-gym-owner` | Onboarding |
| `/coaching`, `/coaching/[slug]`, `/nutrition`, `/exercises`, `/exercise-check`, `/subscription` | Catalog / marketing / gated tools |
| `/my-fitness` | Member hub (progress, plan, gamification) |
| `/chat`, `/notifications` | Messaging |
| `/meal-plans`, `/community`, `/analytics`, `/live-sessions` | Plan-gated member features |
| `/trainer-dashboard`, `/gym-owner`, `/admin` | Role dashboards |
| `/progress`, `/workout-plans` | Redirect → `/my-fitness` |
| `/pricing` | Redirect → `/subscription` |

---

## 7. API routes (summary)

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
`/api/subscription`, `/api/subscription/confirm`, `/api/webhooks/stripe` — **payments PAUSED** (read plan fields for gating only; Stripe simulated/test; JazzCash not started)

### Ops
`/api/health`, `/api/seed`, `/api/admin/*`, `/api/gym-owner/*`

---

## 8. Environment variables

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
| No extra live-video env vars | Optional | Live sessions use `meet.jit.si` directly |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Optional | Chat image upload 503 |
| `CLOUDINARY_UPLOAD_FOLDER` | Optional | Defaults to `chat` |
| `STRIPE_*` | Optional / **PAUSED** | Simulated checkout when unset; live Checkout out of scope for current phase |
| `SMTP_*` | Optional | Reset/verify links logged + `devLink` returned in development |
| `GOOGLE_CLIENT_*` | Optional | OAuth returns 503; when set, links same-email accounts via `googleId` |
| `GEMINI_API_KEY` / `SPOONACULAR_API_KEY` | Optional | AI / food search degrade gracefully |

**Windows note:** Some ISP DNS resolvers refuse MongoDB SRV (`querySrv ECONNREFUSED`). `src/lib/mongodb.ts` resolves SRV via Google DNS and connects with a direct URI.

---

## 9. Local development

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

## 10. Known gaps & suggested next steps

**Gaps (env / product):**

1. Production realtime requires Pusher and Cloudinary credentials on Vercel; Jitsi uses `meet.jit.si`
2. Google OAuth and SMTP need real credentials for production auth UX  
3. **Payments PAUSED:** Stripe is one-time Checkout (simulated/test locally); JazzCash planned, not started — not in current verification scope  
4. Live video still depends on browser camera/microphone access and third-party iframe availability

**Security (2026-07-13 hardening):**

- Zod + Mongo operator rejection on mutating API bodies (`src/lib/validation.ts`)  
- Plain-text / http(s) URL sanitization (`src/lib/sanitize.ts`)  
- CSP and related headers in `next.config.ts`  
- In-memory rate limits on auth, AI, and upload routes  
- See `docs/SECURITY_AUDIT_REPORT.md` for vuln / fix / retest  

**Suggested next steps:**

1. Provision Pusher / Cloudinary / SMTP / Google; document dashboard URLs in team wiki  
2. When payments resume: live Stripe keys + webhook, then JazzCash design  
3. Add CI smoke tests against `/api/health` + login (`npm run live-verify`)  
4. Consider MongoDB connection string with explicit hosts for CI Windows runners  
5. Remove or archive unused custom `server.ts` if fully replaced by Pusher  
6. Replace in-memory rate limits with Redis for multi-instance Vercel production  

---

## 11. Related docs

- `docs/LIVE_VERIFICATION_REPORT.md` — live probe results (latest: 69/69 pass)  
- `docs/SECURITY_AUDIT_REPORT.md` — NoSQL / XSS / CSP / rate-limit audit  
- `docs/AUDIT_REPORT.md` — Working / Partial / Cannot-run matrix  
- `docs/REALTIME_CHAT.md` — Pusher channel conventions  

- `docs/MODULE_INVENTORY.md` — routes/API map and merge + slug migration notes  
- `BUG_REPORT.md` — verification bugs and known limitations  

---

## 12. Branch integration (2026-07-29)

- **`musadiq`** merged **`remotes/fyp-final/main`** (integration main; includes Tayyab UI/admin work). Local branch **`tayyab`** was already contained after that merge.
- Local git branch **`main`** has **unrelated history** to `musadiq`; use **`fyp-final/main`** for integration, not local `main`, unless histories are reconciled deliberately.
- **Trainer slugs:** run `npm run backfill-trainer-slugs` once per environment after deploy; new trainers receive slugs on registration.

---

*Generated for zero-context readers. Prefer live reports over assuming a file’s presence means a feature works.*  
*Payments: PAUSED (Stripe simulated/test; JazzCash planned not started).*
