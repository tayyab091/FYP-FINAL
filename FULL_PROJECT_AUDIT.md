# Full Project Playwright Audit

**Generated:** 2026-08-07T15:01:16.363Z  
**Tool:** Playwright (Chromium) via `e2e/full-project-audit.spec.ts`  
**Summary:** 102 PASS · 0 WARN · 0 FAIL · 0 SKIP (102 total checks)

## Launch Blocker Fixes (2026-08-07)

| Issue | Before (baseline audit) | After (verified) | Evidence |
|-------|-------------------------|------------------|----------|
| Basic `/exercise-check` bypass | WARN — gate not detected; user2 had stale `pro` plan in DB | PASS — `subscription-gate` visible; API POST `/api/gamification/form-check` → **403** | `e2e/plan-gate-verify.spec.ts`, seed reset |
| Basic `/analytics` bypass | WARN — gate not detected | PASS — `subscription-gate` visible; API GET `/api/analytics/summary` → **403** | Playwright plan gates 6/6 PASS |
| Elite `/live-sessions` false gate | WARN — hero text "Elite Live" matched upgrade regex | PASS — no `subscription-gate`; API GET `/api/live-sessions` → **200** | Renamed eyebrow to "Live Training" |
| Trainer availability form | FAIL — 0 time inputs, save hidden | PASS — 10 time inputs, save visible | `data-testid="availability-form"` |
| Nutrition duplicate React keys | WARN on 3 role nutrition pages | PASS — no console key warnings | Deduped meal keys + category/area metadata |

**Root causes (plan gates):**
1. **Stale seed data** — `user2@test.com` was created as Basic but later held `pro` in MongoDB; seed only set plan on first insert.
2. **Missing import** — `ExerciseCheckSteps` referenced without import crashed logged-in `/exercise-check` before gate could render.
3. **Misleading UI** — marketing steps rendered below gate made Basic users appear to have access.
4. **False-positive detection** — audit matched page copy "Elite"/"upgrade" instead of actual `AccessGate` component.

**API enforcement confirmed independent of UI:**
- Basic → `POST /api/gamification/form-check` = 403
- Basic → `GET /api/analytics/summary` = 403
- Elite → `GET /api/live-sessions` = 200
- Elite → `POST /api/live-sessions/{id}/join` = 403 only for non-Elite (join route checks `normalizePlan(plan) !== 'elite'`)

## Executive Summary

| Area | PASS | WARN | FAIL | SKIP |
|------|------|------|------|------|
| Infrastructure | 2 | 0 | 0 | 0 |
| Public Pages | 11 | 0 | 0 | 0 |
| Security | 14 | 0 | 0 | 0 |
| Auth Forms | 5 | 0 | 0 | 0 |
| Role Access | 7 | 0 | 0 | 0 |
| Role Pages | 45 | 0 | 0 | 0 |
| Settings UI | 4 | 0 | 0 | 0 |
| Plan Gates | 6 | 0 | 0 | 0 |
| Trainer Dashboard | 7 | 0 | 0 | 0 |
| Admin UI | 1 | 0 | 0 | 0 |

## Test Accounts Used

| Role | Email | Password |
|------|-------|----------|
| user (Pro) | user1@test.com | User@123 |
| user (Basic) | user2@test.com | User@123 |
| user (Elite) | user3@test.com | User@123 |
| trainer | ali@test.com | Trainer@123 |
| gym_owner | gymowner@test.com | GymOwner@123 |
| admin | admin@test.com | Admin@123 |
| super_admin | superadmin@test.com | SuperAdmin@12345 |

*Requires seeded database (`POST /api/seed`). super_admin via `scripts/verify-role-apis.mjs` if missing.*

## Detailed Results

### Infrastructure

| Status | Role | Route | Test | Detail |
|--------|------|-------|------|--------|
| ✅ | — | — | GET /api/health | Status 200 |
| ✅ | — | — | GET /api/trainers | Status 200 |

### Public Pages

| Status | Role | Route | Test | Detail |
|--------|------|-------|------|--------|
| ✅ | guest | / | Page load: / | Loaded OK — 3 buttons, 0 inputs, 36 links, 0 forms |
| ✅ | guest | /coaching | Page load: /coaching | Loaded OK — 17 buttons, 1 inputs, 14 links, 0 forms |
| ✅ | guest | /exercises | Page load: /exercises | Loaded OK — 9 buttons, 5 inputs, 14 links, 0 forms |
| ✅ | guest | /nutrition | Page load: /nutrition | Loaded OK — 31 buttons, 4 inputs, 15 links, 0 forms |
| ✅ | guest | /subscription | Page load: /subscription | Loaded OK — 6 buttons, 0 inputs, 15 links, 0 forms |
| ✅ | guest | /login | Page load: /login | Loaded OK — 4 buttons, 2 inputs, 5 links, 1 forms |
| ✅ | guest | /signup | Page load: /signup | Loaded OK — 4 buttons, 6 inputs, 2 links, 1 forms |
| ✅ | guest | /register-trainer | Page load: /register-trainer | Loaded OK — 12 buttons, 7 inputs, 1 links, 1 forms |
| ✅ | guest | /register-gym-owner | Page load: /register-gym-owner | Loaded OK — 4 buttons, 8 inputs, 1 links, 1 forms |
| ✅ | guest | /forgot-password | Page load: /forgot-password | Loaded OK — 3 buttons, 1 inputs, 1 links, 1 forms |
| ✅ | guest | /exercise-check | Page load: /exercise-check | Loaded OK — 3 buttons, 0 inputs, 15 links, 0 forms |

### Security

| Status | Role | Route | Test | Detail |
|--------|------|-------|------|--------|
| ✅ | — | /settings | Unauthenticated /settings | Redirected to login |
| ✅ | — | /admin | Unauthenticated /admin | Redirected to login |
| ✅ | — | /my-fitness | Unauthenticated /my-fitness | Redirected to login |
| ✅ | — | /trainer-dashboard | Unauthenticated /trainer-dashboard | Redirected to login |
| ✅ | — | /gym-owner | Unauthenticated /gym-owner | Redirected to login |
| ✅ | — | — | Invalid password rejected | Remains on login |
| ✅ | user (Pro) | /admin | Cross-role access blocked | Final URL: http://localhost:3000/dashboard |
| ✅ | user (Pro) | /trainer-dashboard | Cross-role access blocked | Final URL: http://localhost:3000/dashboard |
| ✅ | user (Pro) | /gym-owner | Cross-role access blocked | Final URL: http://localhost:3000/dashboard |
| ✅ | trainer | /admin | Cross-role access blocked | Final URL: http://localhost:3000/trainer-dashboard |
| ✅ | trainer | /my-fitness | Cross-role access blocked | Final URL: http://localhost:3000/trainer-dashboard |
| ✅ | gym_owner | /admin | Cross-role access blocked | Final URL: http://localhost:3000/gym-owner |
| ✅ | gym_owner | /trainer-dashboard | Cross-role access blocked | Final URL: http://localhost:3000/gym-owner |
| ✅ | admin | /my-fitness | Cross-role access blocked | Final URL: http://localhost:3000/admin |

### Auth Forms

| Status | Role | Route | Test | Detail |
|--------|------|-------|------|--------|
| ✅ | — | /login | Form inventory /login | 2 fields, 1 submit button(s) |
| ✅ | — | /signup | Form inventory /signup | 6 fields, 1 submit button(s) |
| ✅ | — | /register-trainer | Form inventory /register-trainer | 7 fields, 1 submit button(s) |
| ✅ | — | /register-gym-owner | Form inventory /register-gym-owner | 8 fields, 1 submit button(s) |
| ✅ | — | /forgot-password | Form inventory /forgot-password | 1 fields, 1 submit button(s) |

### Role Access

| Status | Role | Route | Test | Detail |
|--------|------|-------|------|--------|
| ✅ | user (Pro) | — | Login | Landed on http://localhost:3000/dashboard |
| ✅ | user (Basic) | — | Login | Landed on http://localhost:3000/dashboard |
| ✅ | user (Elite) | — | Login | Landed on http://localhost:3000/dashboard |
| ✅ | trainer | — | Login | Landed on http://localhost:3000/trainer-dashboard |
| ✅ | gym_owner | — | Login | Landed on http://localhost:3000/gym-owner |
| ✅ | admin | — | Login | Landed on http://localhost:3000/admin |
| ✅ | super_admin | — | Login | Landed on http://localhost:3000/admin |

### Role Pages

| Status | Role | Route | Test | Detail |
|--------|------|-------|------|--------|
| ✅ | user (Pro) | /dashboard | Page load: /dashboard | Loaded OK — 6 buttons, 0 inputs, 20 links, 0 forms |
| ✅ | user (Pro) | /my-fitness | Page load: /my-fitness | Loaded OK — 10 buttons, 0 inputs, 13 links, 0 forms |
| ✅ | user (Pro) | /meal-plans | Page load: /meal-plans | Loaded OK — 6 buttons, 0 inputs, 12 links, 0 forms |
| ✅ | user (Pro) | /community | Page load: /community | Loaded OK — 8 buttons, 2 inputs, 13 links, 1 forms |
| ✅ | user (Pro) | /chat | Page load: /chat | Loaded OK — 4 buttons, 0 inputs, 13 links, 0 forms |
| ✅ | user (Pro) | /leaderboard | Page load: /leaderboard | Loaded OK — 12 buttons, 0 inputs, 26 links, 0 forms |
| ✅ | user (Pro) | /analytics | Page load: /analytics | Loaded OK — 7 buttons, 0 inputs, 12 links, 0 forms |
| ✅ | user (Pro) | /live-sessions | Page load: /live-sessions | Loaded OK — 7 buttons, 0 inputs, 13 links, 0 forms |
| ✅ | user (Pro) | /notifications | Page load: /notifications | Loaded OK — 24 buttons, 0 inputs, 12 links, 0 forms |
| ✅ | user (Pro) | /settings | Page load: /settings | Loaded OK — 13 buttons, 5 inputs, 12 links, 0 forms |
| ✅ | user (Pro) | /exercise-check | Page load: /exercise-check | Loaded OK — 11 buttons, 0 inputs, 14 links, 0 forms |
| ✅ | user (Basic) | /dashboard | Page load: /dashboard | Loaded OK — 6 buttons, 0 inputs, 21 links, 0 forms |
| ✅ | user (Basic) | /my-fitness | Page load: /my-fitness | Loaded OK — 10 buttons, 0 inputs, 14 links, 0 forms |
| ✅ | user (Basic) | /community | Page load: /community | Loaded OK — 8 buttons, 2 inputs, 14 links, 1 forms |
| ✅ | user (Basic) | /analytics | Page load: /analytics | Loaded OK — 6 buttons, 0 inputs, 14 links, 0 forms |
| ✅ | user (Basic) | /exercise-check | Page load: /exercise-check | Loaded OK — 6 buttons, 0 inputs, 15 links, 0 forms |
| ✅ | user (Basic) | /live-sessions | Page load: /live-sessions | Loaded OK — 6 buttons, 0 inputs, 14 links, 0 forms |
| ✅ | user (Elite) | /dashboard | Page load: /dashboard | Loaded OK — 6 buttons, 0 inputs, 20 links, 0 forms |
| ✅ | user (Elite) | /live-sessions | Page load: /live-sessions | Loaded OK — 6 buttons, 0 inputs, 12 links, 0 forms |
| ✅ | user (Elite) | /exercise-check | Page load: /exercise-check | Loaded OK — 11 buttons, 0 inputs, 14 links, 0 forms |
| ✅ | user (Elite) | /analytics | Page load: /analytics | Loaded OK — 7 buttons, 0 inputs, 12 links, 0 forms |
| ✅ | trainer | /trainer-dashboard | Page load: /trainer-dashboard | Loaded OK — 12 buttons, 0 inputs, 12 links, 0 forms |
| ✅ | trainer | /trainer-dashboard/exercises | Page load: /trainer-dashboard/exercises | Loaded OK — 7 buttons, 3 inputs, 34 links, 0 forms |
| ✅ | trainer | /trainer-dashboard/nutrition | Page load: /trainer-dashboard/nutrition | Loaded OK — 7 buttons, 3 inputs, 10 links, 0 forms |
| ✅ | trainer | /meal-plans | Page load: /meal-plans | Loaded OK — 6 buttons, 0 inputs, 9 links, 0 forms |
| ✅ | trainer | /live-sessions | Page load: /live-sessions | Loaded OK — 7 buttons, 0 inputs, 9 links, 0 forms |
| ✅ | trainer | /chat | Page load: /chat | Loaded OK — 4 buttons, 0 inputs, 11 links, 0 forms |
| ✅ | trainer | /settings | Page load: /settings | Loaded OK — 14 buttons, 5 inputs, 9 links, 0 forms |
| ✅ | gym_owner | /gym-owner | Page load: /gym-owner | Loaded OK — 11 buttons, 8 inputs, 11 links, 2 forms |
| ✅ | gym_owner | /gym-owner/exercises | Page load: /gym-owner/exercises | Loaded OK — 7 buttons, 3 inputs, 33 links, 0 forms |
| ✅ | gym_owner | /gym-owner/nutrition | Page load: /gym-owner/nutrition | Loaded OK — 7 buttons, 3 inputs, 9 links, 0 forms |
| ✅ | gym_owner | /chat | Page load: /chat | Loaded OK — 4 buttons, 0 inputs, 9 links, 0 forms |
| ✅ | gym_owner | /settings | Page load: /settings | Loaded OK — 13 buttons, 5 inputs, 8 links, 0 forms |
| ✅ | admin | /admin | Page load: /admin | Loaded OK — 13 buttons, 0 inputs, 13 links, 0 forms |
| ✅ | admin | /admin?tab=users | Page load: /admin?tab=users | Loaded OK — 36 buttons, 0 inputs, 13 links, 0 forms |
| ✅ | admin | /admin?tab=trainers | Page load: /admin?tab=trainers | Loaded OK — 13 buttons, 0 inputs, 13 links, 0 forms |
| ✅ | admin | /admin?tab=gyms | Page load: /admin?tab=gyms | Loaded OK — 13 buttons, 0 inputs, 13 links, 0 forms |
| ✅ | admin | /admin?tab=verifications | Page load: /admin?tab=verifications | Loaded OK — 13 buttons, 0 inputs, 13 links, 0 forms |
| ✅ | admin | /admin?tab=audit | Page load: /admin?tab=audit | Loaded OK — 13 buttons, 0 inputs, 13 links, 0 forms |
| ✅ | admin | /admin?tab=subscriptions | Page load: /admin?tab=subscriptions | Loaded OK — 105 buttons, 23 inputs, 13 links, 0 forms |
| ✅ | admin | /admin/exercises | Page load: /admin/exercises | Loaded OK — 7 buttons, 3 inputs, 35 links, 0 forms |
| ✅ | admin | /admin/nutrition | Page load: /admin/nutrition | Loaded OK — 7 buttons, 3 inputs, 11 links, 0 forms |
| ✅ | admin | /settings | Page load: /settings | Loaded OK — 13 buttons, 5 inputs, 10 links, 0 forms |
| ✅ | super_admin | /admin?tab=super | Page load: /admin?tab=super | Loaded OK — 24 buttons, 3 inputs, 13 links, 1 forms |
| ✅ | super_admin | /admin?tab=users | Page load: /admin?tab=users | Loaded OK — 40 buttons, 0 inputs, 13 links, 0 forms |

### Settings UI

| Status | Role | Route | Test | Detail |
|--------|------|-------|------|--------|
| ✅ | user (Pro) | /settings | Settings sidebar tabs | 5 tab buttons visible |
| ✅ | trainer | /settings | Settings sidebar tabs | 6 tab buttons visible |
| ✅ | gym_owner | /settings | Settings sidebar tabs | 5 tab buttons visible |
| ✅ | admin | /settings | Settings sidebar tabs | 5 tab buttons visible |

### Plan Gates

| Status | Role | Route | Test | Detail |
|--------|------|-------|------|--------|
| ✅ | user (Basic) | /exercise-check | Subscription gate | Gate/upgrade UI shown |
| ✅ | user (Pro) | /exercise-check | Subscription gate | Feature appears accessible |
| ✅ | user (Basic) | /analytics | Subscription gate | Gate/upgrade UI shown |
| ✅ | user (Pro) | /analytics | Subscription gate | Feature appears accessible |
| ✅ | user (Pro) | /live-sessions | Subscription gate | Gate/upgrade UI shown |
| ✅ | user (Elite) | /live-sessions | Subscription gate | Feature appears accessible |

### Trainer Dashboard

| Status | Role | Route | Test | Detail |
|--------|------|-------|------|--------|
| ✅ | trainer | — | Tab: Overview | Tab clickable |
| ✅ | trainer | — | Tab: Client Requests | Tab clickable |
| ✅ | trainer | — | Tab: My Clients | Tab clickable |
| ✅ | trainer | — | Tab: Meal Plans | Tab clickable |
| ✅ | trainer | — | Tab: Availability | Tab clickable |
| ✅ | trainer | — | Tab: chat | Tab clickable |
| ✅ | trainer | — | Availability form | 10 time inputs, save visible: true |

### Admin UI

| Status | Role | Route | Test | Detail |
|--------|------|-------|------|--------|
| ✅ | admin | /admin?tab=users | Users table | 27 user rows, 23 suspend/reactivate buttons |

## UI Element Inventory (aggregated per role routes)

Across audited pages: **672** visible buttons, **110** inputs/selects/textareas, **766** links, **10** forms.

## Security Findings

- **PASS** — Unauthenticated /settings: Redirected to login
- **PASS** — Unauthenticated /admin: Redirected to login
- **PASS** — Unauthenticated /my-fitness: Redirected to login
- **PASS** — Unauthenticated /trainer-dashboard: Redirected to login
- **PASS** — Unauthenticated /gym-owner: Redirected to login
- **PASS** — Invalid password rejected: Remains on login
- **PASS** — Cross-role access blocked: Final URL: http://localhost:3000/dashboard
- **PASS** — Cross-role access blocked: Final URL: http://localhost:3000/dashboard
- **PASS** — Cross-role access blocked: Final URL: http://localhost:3000/dashboard
- **PASS** — Cross-role access blocked: Final URL: http://localhost:3000/trainer-dashboard
- **PASS** — Cross-role access blocked: Final URL: http://localhost:3000/trainer-dashboard
- **PASS** — Cross-role access blocked: Final URL: http://localhost:3000/gym-owner
- **PASS** — Cross-role access blocked: Final URL: http://localhost:3000/gym-owner
- **PASS** — Cross-role access blocked: Final URL: http://localhost:3000/admin

## Improvement Suggestions

1. Add data-testid attributes on critical actions (Save, Suspend, Delete, Connect) for stable selectors across theme changes.
2. Run Playwright in CI on every PR with seeded test DB (Docker + mongo) for regression safety.
3. Add E2E tests for password reset and email verification flows when SMTP is configured.
4. Implement rate limiting tests on /api/auth/login and /api/auth/register to verify brute-force protection.
5. Add visual regression (Playwright screenshots) for landing, dashboard, and settings in light/dark mode.
6. Document super_admin bootstrap in README and include in seed for complete admin audit coverage.

## Raw Data

See `e2e/audit-output/audit-results.json` for machine-readable results.
