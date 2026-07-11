# T.E.S.T. — Train. Eat. Sleep. Thrive.

Full-stack fitness coaching platform built as a Final Year Project. Members connect with verified trainers, follow workout plans, log nutrition, track body metrics, and chat with coaches — all in one Next.js application backed by MongoDB.

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT (httpOnly cookies) |
| UI | Tailwind CSS 4, shadcn/ui, Recharts |
| AI | Google Gemini (chatbot, nutrition hints) |
| Pose | MediaPipe Pose (exercise form checker) |
| Payments | Simulated in-app (Stripe keys optional) |

## Features

- **Trainer marketplace** — Browse, filter, and connect with verified coaches
- **Coaching relationships** — Request / accept flow with permission flags (`canViewProgress`, `canViewNutrition`, etc.)
- **Workout plans** — Trainers create weekly schedules; clients complete sessions with history & streaks
- **Nutrition tracking** — Food search, meal logging, personalized calorie targets
- **Progress tracking** — Weight, body fat, chest/waist/hips measurements with charts
- **Chat** — Trainer–client messaging with workout plan attachments
- **AI form checker** — Pro/Elite gated pose feedback (`/exercise-check`)
- **Subscriptions** — Basic / Pro / Elite tiers with plan limits (simulated upgrade flow)
- **Admin panel** — User management, trainer/gym verification, suspend users, audit logs
- **Gym owner dashboard** — Gym and trainer analytics

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

3. **Run development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

4. **Seed the database** (recommended for demos)

With the dev server running:

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d "{\"setupKey\": \"YOUR_ADMIN_SETUP_KEY\"}"
```

Replace `YOUR_ADMIN_SETUP_KEY` with the value from `.env.local`.

> **Note:** The coaching page shows **preview trainers** when the DB is empty. Connect buttons are disabled until you seed — fallback IDs are not real MongoDB documents.

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
| **Basic** | Free — 3 workouts/week, 5 trainer connection requests |
| **Pro** | Unlimited workouts, AI form checker, 1-on-1 chat |
| **Elite** | Everything in Pro + unlimited trainer connections |

Upgrades are **simulated** on `/subscription` (no real Stripe charge). Paid plans expire after 30 days and auto-downgrade to Basic on next `/api/auth/me` call.

## Key routes

| Path | Description |
|------|-------------|
| `/coaching` | Trainer marketplace |
| `/coaching/[id]` | Trainer profile detail |
| `/my-fitness` | Member hub (workout, history, nutrition, progress) |
| `/trainer-dashboard` | Trainer workspace |
| `/chat` | Messaging |
| `/exercise-check` | AI pose form checker (Pro/Elite) |
| `/admin` | Platform admin |
| `/settings` | Profile & coach profile editing |

## Scripts

```bash
npm run dev      # Development
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

## Project structure

```
src/
├── app/              # Next.js App Router (pages + API routes)
├── components/       # UI components
├── hooks/            # React hooks (useAuth)
├── lib/              # Auth, MongoDB, plans, subscription, nutrition helpers
├── models/           # Mongoose schemas
└── types/            # Shared TypeScript types
```

## Optional integrations

- **GEMINI_API_KEY** — Powers the AI chatbot (`/api/ai/chat`)
- **SPOONACULAR_API_KEY** — Enhanced food nutrition search; falls back to local data without it
- **Stripe keys** — Reserved for future real payments; not required for FYP demo

## License

Academic FYP project — see institution guidelines for use and distribution.
