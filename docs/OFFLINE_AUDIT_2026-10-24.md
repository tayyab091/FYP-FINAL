# Offline project audit — 24 October 2026

## Scope and evidence

Inventory: **41 page files and 93 API route files**. Reviewed shared auth, payment, validation, catalog, preview, workout, availability, AI generation, and layout code. Production compilation covers the entire application. Browser assertions cover public pages, guest route protection, and selected authenticated UI flows with explicit fixtures. This is not a claim that every database workflow or external integration has been tested.

The configured local MongoDB did not respond (`/api/health` returned 503). The user chose to continue offline. No database was seeded, no existing account was changed, and no real payment was made. Existing unrelated reports and the initial TypeScript changes were preserved.

## Fixes

| Module | Problem and correction |
| --- | --- |
| Checkout | Stripe errors could grant a simulated upgrade. Errors now return 502 without writing paid access; production without payment credentials returns 503. Demo activation is development-only. Hosted Checkout no longer depends on a publishable browser key. |
| Checkout UI | Payment cancellation parameters disagreed between API and UI; success URLs without a session claimed activation. Both were corrected. The confirmation dialog now obtains Stripe/demo/unavailable mode from the server. |
| Payment confirmations | Replaying a paid session could restart an expired term, and stale events could overwrite a newer purchase. Expiry is anchored to the payment creation date and activation uses an atomic chronological guard. Month-end dates clamp correctly. |
| Plan access | Inactive or invalid-date paid subscriptions could retain paid access. Effective access now falls back to Basic. |
| Authentication | Token payload shape and signing algorithm are checked. Recovery tokens are excluded from default user queries. Refresh results cannot overwrite newer login/logout state; malformed refresh responses no longer leave loading stuck. Failed logout keeps the session visible and reports the failure. Logout preserves browser preferences. |
| Workout tracking | Cancelled workouts could be completed. Completion now requires `in_progress`. Checklist/cancel writes use atomic status guards to avoid overwriting concurrent completion. |
| Exercise catalogs | Metadata requests silently changed page size, skipping records on load-more. Requested page and size are preserved. Stale searches and pagination responses cannot overwrite new filters. Fetch errors have retry controls; broken images have fallback content; external-provider failure uses the local exercise catalog. |
| Recipe catalogs | Failed previews stayed loading indefinitely. Both public and workspace previews now show a retryable error. Workspace filter/retry/pagination requests reject stale responses. Background catalog warm-up failures no longer produce unhandled rejections. |
| Preview UI | Replaced 8–11px preview text with more readable text, increased controls, and removed the cramped fixed-height preview. Shared images recover from failure. |
| Dashboard UI | Metric cards have less excess padding, a compact mobile grid, and improved light-mode contrast. Exercise links describe the action rather than exposing internal IDs. |
| Legal pages | Removed nested main landmarks on Privacy and Terms, fixing both failed browser assertions and invalid page semantics. |
| Form checker | CSP blocked MediaPipe scripts loaded from its CDN. Added the exact versioned script source and pinned asset URLs to the installed pose version. Camera/pose accuracy still requires device testing. |
| Plan validation | Workout schedules and meal-plan edits validate nested structures and valid enum values before persistence. Invalid activity levels are rejected before Mongoose validation. |
| Trainer availability | Weekdays, clock times, time order, and timezones are validated. Malformed requests return 400. |
| AI workout generation | Added bounded inputs, rate limiting, configured model selection, provider timeout, structured output validation, and recovery after provider failure. Offline plans now respect requested days, beginner set counts, and equipment availability. Non-gym fallback uses bodyweight movements. |
| Notifications / API | Bounded invalid notification limits; added PATCH to advertised CORS methods; invalid login bodies are rejected before connecting to the database. |
| Maintenance | Added repeatable test/typecheck commands, removed unused code, fixed meal-plan effect dependencies, and supported an isolated build directory without changing the existing `.next` junction. |

## Validation

- Offline unit/route/policy tests: **27 passed**, zero failures.
- Lint: **passed**, zero errors or warnings.
- Production build and TypeScript: **passed**. The final small recipe-thumbnail fallback is additionally checked by the targeted development-browser run below.
- Chromium: **38 passed**, zero retries. First pass: 31 passed, two failures caused by nested main landmarks; those were fixed. An intermediate run was stopped because its server started before the build had finished; the successful run used a fresh server after build completion.
- Final thumbnail fallback: **2 targeted browser tests passed**, including an assertion that failed preview images are removed. Development used fallback fonts because its sandbox could not download Google Fonts; the production build downloaded and compiled the configured fonts successfully.
- Browser fixtures exercise recovery from failed requests, stale searches, broken images, recipe preview retries, payment return messages, checkout configuration, and mobile/desktop layouts.
- Browser smoke checks use real rendered pages; authenticated fixture checks do not prove database persistence or role ownership in production.

## Remaining verification and production work

1. Start a dedicated test MongoDB and run the existing database-dependent suites. Verify real signup/login/recovery; trainer relationships; workout/meal persistence; analytics/leaderboards; community; chat/notifications; admin moderation; gym ownership; and live-session membership/capacity. Dynamic detail pages need real fixture records.
2. Exercise Stripe sandbox callbacks, webhook retry/order/concurrency, and recurring invoice/cancellation handling. Existing recurring-price checkout supports the initial checkout event; a complete renewal/cancellation lifecycle is still required before enabling recurring production billing. The new chronological guard should be tested against simultaneous real MongoDB writes.
3. Configure and verify SMTP, Google OAuth, Cloudinary, Pusher, Gemini, Maps, and Jitsi as applicable. Test camera permission denial, device changes, and pose behavior with real hardware/video.
4. Distributed rate limiting, durable idempotent XP awards across partial failures, broader abuse/load testing, and operational monitoring remain production-hardening work. Current rate limits are in-memory per process. Unit tests cannot establish multi-instance or database transaction guarantees.
5. The offline bodyweight workout fallback is generic; further personalization is still needed for detailed muscle/equipment preferences.

## Reproduce

```powershell
npm test
npm run lint
npm run typecheck
$env:NEXT_DIST_DIR='.next-audit'
npm run build
npm run start
# In another terminal, with the server running:
$env:PLAYWRIGHT_REUSE_SERVER='1'
npm run test:e2e -- e2e/regressions.spec.ts --retries=0
```

The ordinary build remains `.next`; `NEXT_DIST_DIR` is optional. A Windows sandbox may prevent `tsx` from reading OS user information; the test command passed outside that sandbox. Google Fonts require network access during a cold build.

Mobile screenshot evidence (synthetic recipe data): [public nutrition](audit-2026-10-24/public-recipe-mobile.png), [trainer nutrition](audit-2026-10-24/trainer-recipe-mobile.png).

## Page inventory and runtime coverage

All routes below are included in the application build. “Deferred” means that authenticated/dynamic behavior was not proven offline, rather than a passing result.

| Page | Runtime coverage |
| --- | --- |
| / | Public mobile smoke assertions |
| /admin | Guest redirect assertion; authenticated workflow deferred |
| /admin/exercises | Deferred; build coverage only |
| /admin/nutrition | Deferred; build coverage only |
| /analytics | Guest redirect assertion; authenticated workflow deferred |
| /chat | Guest redirect assertion; authenticated workflow deferred |
| /chat/[id] | Deferred; build coverage only |
| /coaching | Public mobile smoke assertions |
| /coaching/[slug] | Deferred; build coverage only |
| /community | Guest redirect assertion; authenticated workflow deferred |
| /dashboard | Guest redirect assertion; authenticated workflow deferred |
| /exercise-check | Public mobile smoke assertions |
| /exercises | Public mobile smoke assertions |
| /exercises/[id] | Deferred; build coverage only |
| /forgot-password | Public mobile smoke assertions |
| /gym-owner | Guest redirect assertion; authenticated workflow deferred |
| /gym-owner/exercises | Deferred; build coverage only |
| /gym-owner/nutrition | Deferred; build coverage only |
| /gyms | Public mobile smoke assertions |
| /gyms/[slug] | Deferred; build coverage only |
| /leaderboard | Guest redirect assertion; authenticated workflow deferred |
| /live-sessions | Guest redirect assertion; authenticated workflow deferred |
| /live-sessions/[id] | Deferred; build coverage only |
| /login | Public mobile smoke assertions |
| /meal-plans | Guest redirect assertion; authenticated workflow deferred |
| /my-fitness | Guest redirect assertion; authenticated workflow deferred |
| /notifications | Guest redirect assertion; authenticated workflow deferred |
| /nutrition | Public mobile smoke assertions |
| /nutrition/[id] | Deferred; build coverage only |
| /privacy | Public mobile smoke assertions |
| /register-gym-owner | Public mobile smoke assertions |
| /register-trainer | Public mobile smoke assertions |
| /reset-password | Public mobile smoke assertions |
| /settings | Guest redirect assertion; authenticated workflow deferred |
| /signup | Public mobile smoke assertions |
| /subscription | Public mobile smoke assertions |
| /terms | Public mobile smoke assertions |
| /trainer-dashboard | Guest redirect assertion; authenticated workflow deferred |
| /trainer-dashboard/exercises | Fixture: retry, stale search, broken image, desktop dark mode |
| /trainer-dashboard/nutrition | Fixture: preview failure/retry, mobile layout |
| /verify-email | Public mobile smoke assertions |
