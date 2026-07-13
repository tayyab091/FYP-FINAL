# T.E.S.T. — Train. Eat. Sleep. Thrive.

Full-stack fitness coaching platform built as a Final Year Project. Members connect with verified trainers, follow workout plans, log nutrition, track body metrics, and chat with coaches — all in one Next.js application backed by MongoDB.

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) — Vercel serverless |
| Language | TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT (httpOnly cookies), Google OAuth, email verify / password reset |
| Realtime | **Pusher** (chat + notifications) — Vercel-compatible |
| Live video | **Daily.co** rooms (Elite); scheduling gated in our API |
| Uploads | **Vercel Blob** (chat images) |
| UI | Tailwind CSS 4, shadcn/ui, Recharts, Framer Motion |
| AI | Google Gemini (chatbot, nutrition hints) |
| Pose | MediaPipe Pose (exercise form checker) |
| Payments | Stripe Checkout (test mode) with simulated fallback when keys unset |
| Email | SMTP via nodemailer (console link fallback in development) |
| Deploy | **Vercel** serverless (no Socket.io / no local disk writes) |

## Features

- **Trainer marketplace** — Browse, filter, and connect with verified coaches
- **Coaching relationships** — Request / accept flow with permission flags
- **Workout plans** — Trainers create weekly schedules; clients complete sessions with history & streaks
- **Nutrition tracking** — Food search, meal logging, personalized calorie targets
- **Personalized meal plans** — Rule-based Pro+ generator with save / edit / activate (`/meal-plans`)
- **Progress tracking** — Weight, body fat, measurements with charts
- **Advanced analytics** — Pro+ dashboard: workouts, nutrition, weight trends (`/analytics`)
- **Community feed** — Basic+ posts, likes, comments (`/community`)
- **Live training sessions** — Elite scheduling + **Daily.co** video rooms (`/live-sessions`)
- **Chat** — REST + **Pusher** realtime; workout plan cards and **Vercel Blob** image uploads
- **Notifications** — In-app center + bell; Pusher push with poll fallback
- **Trainer reviews** — Rating + comment; average on trainer profiles
- **AI form checker** — Pro/Elite gated pose feedback (`/exercise-check`)
- **Subscriptions** — Basic / Pro / Elite via Stripe Checkout (or simulated when Stripe unset)
- **Auth extras** — Google OAuth, email verification, forgot / reset password
- **Admin / gym owner** — Verification, suspend users, gym analytics
- **Route protection** — Edge-compatible guards in `src/proxy.ts` / `src/middleware.ts` (jose only)

## Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)

## Setup

1. **Clone and install**

```bash
git clone <repo-url>
cd FYP-FINAL
npm install
```

2. **Environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local` and set at minimum:

- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Long random string for signing tokens
- `ADMIN_SETUP_KEY` — Secret used for seed/admin bootstrap
- `NEXT_PUBLIC_APP_URL` — App origin (e.g. `http://localhost:3000`)

Optional integrations (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Real Stripe Checkout |
| `SMTP_*` | Transactional email (verify / reset links) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `PUSHER_*` / `NEXT_PUBLIC_PUSHER_*` | Realtime chat + notifications |
| `DAILY_API_KEY` | Elite live video rooms |
| `BLOB_READ_WRITE_TOKEN` | Chat image uploads (Vercel Blob) |
| `GEMINI_API_KEY` | AI chatbot |
| `SPOONACULAR_API_KEY` | Enhanced food search |

3. **Run development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For production on Vercel, set the env vars above in the project settings.

4. **Seed the database** (recommended for demos)

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d "{\"setupKey\": \"YOUR_ADMIN_SETUP_KEY\"}"
```

> **Note:** The coaching page shows **preview trainers** when the DB is empty. Connect buttons are disabled until you seed.

## Test accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | Admin@123 |
| Gym owner | gymowner@test.com | GymOwner@123 |
| Trainer | ali@test.com | Trainer@123 |
| Member (Pro) | user1@test.com | User@123 |
| Member (Basic) | user2@test.com | User@123 |
| Member (Elite) | user3@test.com | User@123 |

## Test accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | Admin@123 |
| Gym owner | gymowner@test.com | GymOwner@123 |
| Trainer | ali@test.com | Trainer@123 |
| Member (Pro) | user1@test.com | User@123 |
| Member (Basic) | user2@test.com | User@123 |
| Member (Elite) | user3@test.com | User@123 |

Additional trainers: `sarah@test.com`, `usman@test.com`, `fatima@test.com`, `bilal@test.com` — all use `Trainer@123`.

## Subscription tiers

| Plan | Highlights |
|------|------------|
| **Basic** | Free — 3 workouts/week, community feed, 5 trainer connection requests |
| **Pro** | Unlimited workouts, meal plans, analytics, AI form checker, chat |
| **Elite** | Everything in Pro + live sessions + unlimited trainer connections |

**Payments:** When Stripe keys are set, checkout uses Stripe (test mode supported). Simulated `PUT` upgrades are **blocked** while Stripe is configured. Without Stripe keys, the app falls back to simulated activation for demos.

**Webhooks:** Point Stripe to `POST /api/webhooks/stripe`. Success URL also confirms via `GET /api/subscription/confirm?session_id=…`.

## Key routes

| Path | Description |
|------|-------------|
| `/coaching` | Trainer marketplace |
| `/my-fitness` | Member hub (workout, history, nutrition, progress) |
| `/meal-plans` | Personalized meal plans (Pro+) |
| `/analytics` | Advanced analytics (Pro+) |
| `/community` | Community feed (Basic+) |
| `/live-sessions` | Live training (Elite) |
| `/trainer-dashboard` | Trainer workspace |
| `/chat` | Messaging (text, images, workout plans) |
| `/notifications` | Notification center |
| `/exercise-check` | AI pose form checker (Pro/Elite) |
| `/subscription` | Plans & Stripe checkout |
| `/forgot-password` / `/reset-password` / `/verify-email` | Account recovery |
| `/admin` | Platform admin |
| `/settings` | Profile editing |

## Scripts

```bash
npm run dev      # next dev (Vercel-compatible)
npm run build    # Production build
npm run start    # next start
npm run lint     # ESLint
```

## Project structure

```
src/
├── app/              # Next.js App Router (pages + API routes)
├── components/       # UI components
├── hooks/            # React hooks (useAuth, useChatRealtime)
├── lib/              # Auth, MongoDB, Stripe, Pusher, Daily, Blob, plans
├── models/           # Mongoose schemas
├── middleware.ts     # Edge route guards (re-exports proxy)
└── proxy.ts          # Next.js 16 request proxy / auth redirects
docs/                 # Audit + realtime notes
```

## License

Academic FYP project — see institution guidelines for use and distribution.
