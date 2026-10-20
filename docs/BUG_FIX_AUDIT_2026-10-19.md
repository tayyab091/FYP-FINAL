# Fitness App Bug-Fix Audit

**Date:** 2026-10-19
**Scope:** The 32-item user bug list, supplied screenshots, gym discovery, Google Maps/Places, and the AI fitness coach.

## Outcome

The reported flows were audited against the current application rather than the older screenshots. High-priority defects were fixed, the gym marketplace and detail experience were added, and the AI coach now uses a current Gemini request shape with a goal-aware local fallback. Production compilation and project-scoped linting pass.

## Issue-by-issue status

| # | Issue | Status | Implementation / evidence |
|---:|---|---|---|
| 1 | Role-specific bio label | Fixed | Trainer registration/settings use **Trainer Bio**; irrelevant member fields stay hidden. |
| 2 | Bio not displaying/syncing | Fixed | User and Trainer records are synchronized on registration and profile updates. |
| 3 | Specialty field clarity | Fixed | Specialty remains trainer-only and now includes explanatory help text. |
| 4 | Bio length limit | Fixed | Client, validation, and Mongoose layers enforce 500 characters. |
| 5 | Bio counter | Fixed | Live `current/500` counter is shown below trainer bio fields. |
| 6 | Weight-only goals | Fixed | Goal-specific metrics now cover weight, body-fat percentage, 5K time, mobility frequency, and active minutes. |
| 7 | Fat loss category | Fixed | Added Fat Loss and Body Recomposition goal options. |
| 8 | Exercise visuals | Fixed | Exercise details now include three technique views and accept additional media from the catalog when available. |
| 9 | Irrelevant AI intent | Fixed | Weight-gain intent is evaluated before weight-loss matching; API and UI returned surplus/protein/strength guidance in verification. |
| 10 | Auth navigation | Fixed | Return-home, sign-in/sign-up, trainer registration, and gym registration links are exposed. |
| 11 | Reset-token security | Verified in source | Unknown-email response remains generic and no reset token is created for a missing user; live email delivery still needs SMTP. |
| 12 | Confirm-password eye | Fixed | Independent visibility toggles added across signup, trainer, gym-owner, and reset forms. |
| 13 | “Back to Site” wording | Fixed | Replaced with accessible **Return home** wording. |
| 14 | Back-link placement | Fixed | Link is consistently anchored in the auth shell instead of overlapping forms. |
| 15 | App title mixed with page title | Fixed | Global brand is T.E.S.T.; page headings are separate. |
| 16 | Notification drawer out of view | Fixed | Mobile drawer uses viewport-fixed left/right bounds; desktop keeps anchored width. |
| 17 | Excessive empty space | Improved | Gym/auth/profile layouts use bounded grids and responsive content distribution. |
| 18 | Uneven horizontal spacing | Fixed | Shared responsive container spacing and global horizontal clipping applied. |
| 19 | Congested controls | Improved | Mobile stacking, wrap-safe filters, and spaced panels added in touched flows. |
| 20 | Content overflow | Fixed | Long community/chat/profile text wraps anywhere; page-level horizontal overflow is clipped. |
| 21 | Sidebar icon overlap | Fixed | Mobile drawer and trigger use separate layers/positions. |
| 22 | Sidebar scroll chaining | Fixed | Drawer uses overscroll containment and locks document scrolling while open. |
| 23 | Duplicate sidebar icons | Fixed | One responsive trigger remains. |
| 24 | Sidebar/chatbot icon colors | Fixed | White glyphs on the common green treatment. |
| 25 | Inconsistent icon styling | Improved | Touched auth/navigation/gym flows use Lucide icons with consistent sizing. |
| 26 | Confusing theme selector | Resolved by design | Current product uses one coherent dark performance theme; no non-functional selector is shown. |
| 27 | Favicon | Verified | Existing favicon and web manifest are wired. |
| 28 | Image upload | Fixed | Authenticated profile-image route validates image type/size, uploads to Vercel Blob, previews locally, and reports missing configuration clearly. |
| 29 | Automatic capitalization | Fixed | Email inputs disable capitalization/correction; names use word capitalization intentionally. |
| 30 | URL slugs | Fixed | Gym/trainer profile links use readable, unique slugs; preview gyms use clean names such as `/gyms/fitzone-lahore`. |
| 31 | Filters | Verified/improved | Exercise filters come from API metadata; gym and trainer filters operate on API data and were verified in-browser. |
| 32 | “AI Generator” naming | Fixed | Obsolete label is absent; functionality is described as planner/coach language. |

## New gym and API work

- `/gyms` marketplace with search, city filtering, preview fallback, responsive cards, and selected-gym map.
- `/gyms/[slug]` profiles with facilities, gallery, contact actions, and directions.
- `/api/gyms` database-backed verified listings with a four-second preview fallback deadline.
- `/api/gyms/nearby` server-side Google Places Nearby Search (New), with field masks and a clear unconfigured response.
- `GoogleGymMap` uses the browser embed key when configured and a safe keyless map embed otherwise.
- Gym-owner settings now accept city, coordinates, facilities, and gallery URLs.

## Verification evidence

- `npx eslint src next.config.ts` — pass.
- `npx next build --webpack` — pass with Next.js 16.2.10; TypeScript passed and 70 routes were generated (Webpack was used to avoid a local Turbopack disk-cache spike).
- Browser: `/gyms` rendered at a mobile viewport with three preview gyms and a map.
- Browser: search `Karachi` reduced the result set from three to one and updated the map.
- Browser: `/gyms/elite-fitness-karachi` rendered its cover, facilities, gallery, contact, and map.
- Browser/API: **Help me gain weight** returned relevant calorie-surplus, protein, and progressive-overload guidance.
- Browser: signup exposed Return home, role-registration links, and separate password/confirm-password visibility controls.
- API: missing Google Places key returns a structured `503` (`configured: false`) while the gym marketplace remains usable.

## Environment-dependent items

Live third-party behavior requires keys in `.env.local` or the deployment environment:

- `GEMINI_API_KEY` (optional `GEMINI_MODEL`; local coach fallback remains available)
- `GOOGLE_MAPS_API_KEY` for server-side Places search
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for keyed browser map embeds
- `BLOB_READ_WRITE_TOKEN` for profile/chat image uploads
- `SMTP_*` for real password-reset and verification email delivery

Never expose the server-side Google Places or Gemini keys with a `NEXT_PUBLIC_` prefix.

## Conservative second-pass audit

This follow-up intentionally preserved the existing modules, routes, data models, dependencies, and integrations. The changes are limited to component-level accessibility and resilience improvements:

- Added a keyboard-accessible **Skip to main content** link and the Next.js 16 smooth-scroll marker on the document root.
- Added navigation labels, active-page announcements, menu relationships, and Escape-key dismissal for public and dashboard navigation.
- Improved notification accessibility with unread-count labeling, dialog relationships, and Escape-key dismissal.
- Improved the AI coach with automatic input focus, Escape-key dismissal, an announced conversation log/loading state, and labeled input/send controls.
- Added an accessible city-filter label, live result count, meaningful nearby-search status icon, loading semantics, and retry feedback to the gym marketplace.
- Replaced the gym-detail promise chain with an abort-safe request flow, eliminating the navigation-time unhandled rejection observed in live logs and adding a retry state for temporary failures.

### Second-pass verification

- Changed-file ESLint — pass.
- `npx tsc --noEmit` — pass.
- `GET /` — `200`.
- `GET /gyms` — `200`.
- `GET /gyms/elite-fitness-karachi` — `200`.
- `GET /api/gyms` — `200` using the designed preview fallback while local MongoDB is unavailable.
- `POST /api/ai/chat` — `200` with a non-empty reply.
- No new module, schema, route, package, or architectural changes were introduced.
