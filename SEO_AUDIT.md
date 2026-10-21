# SEO Audit — T.E.S.T. Fitness Platform

**Date:** 2026-07-31  
**Live URL:** https://fyp-final-ten.vercel.app/  
**Stack:** Next.js 16 App Router Metadata API  
**Scope:** Public marketing pages, dynamic catalog pages, dashboard noindex, sitemap/robots, structured data, Core Web Vitals prep

---

## Phase 1 — Baseline Audit (Before Changes)

### Live `<head>` snapshot (curl, 2026-07-31)

All three sampled public routes returned **identical generic metadata** from root layout only:

| Route | `<title>` | `<meta name="description">` | Canonical | Open Graph | Twitter | robots |
|-------|-----------|----------------------------|-----------|------------|---------|--------|
| `/` | T.E.S.T. — Train. Eat. Sleep. Thrive. | Pakistan's first AI-powered… | ❌ | ❌ | ❌ | ❌ (default) |
| `/coaching` | *(same as `/`)* | *(same)* | ❌ | ❌ | ❌ | ❌ |
| `/exercises` | *(same as `/`)* | *(same)* | ❌ | ❌ | ❌ | ❌ |

Additional live observations:
- Homepage body bails out to client-side rendering (`BAILOUT_TO_CLIENT_SIDE_RENDERING`) — crawlers see spinner shell until JS runs.
- `/coaching` and `/exercises` render hero H1 in initial HTML (good).
- No `sitemap.xml` or `robots.txt` endpoints.
- No JSON-LD structured data.
- `metadataBase` not set — relative OG URLs would break if added without fix.

### Code audit (pre-fix)

| Area | Finding | Severity |
|------|---------|----------|
| Root `layout.tsx` | Only `title`, `description`, `keywords` — no template, canonical, OG, Twitter | High |
| Public pages | All `'use client'` — **cannot export `metadata`** per-page | High |
| Dynamic routes | `/coaching/[slug]`, `/exercises/[id]`, `/nutrition/[id]` — no `generateMetadata` | High |
| Dashboard routes | No `noindex` — `/dashboard`, `/admin`, etc. indexable | High |
| Auth routes | Login/signup indexable | Medium |
| Sitemap | Missing | High |
| Robots | Missing | High |
| JSON-LD | Missing Organization / Person / Service | Medium |
| H1 | Public pages have single H1 each ✅ | OK |
| Alt text | Generic (`alt={name}`) on trainer/exercise images | Medium |
| Internal links | Homepage featured trainers were **not linked** to profiles | Medium |
| Images | `CatalogImageFrame` uses `next/image` with fixed aspect ratios ✅ | OK |
| Hero CLS | `.page-hero` sections lacked `min-height` — layout shift on font/motion load | Medium |
| OG image asset | No `/public/og-default.png` | Low |

### Public routes inventory

| Path | Index? | Notes |
|------|--------|-------|
| `/` | Yes | Marketing landing |
| `/coaching` | Yes | Trainer marketplace |
| `/coaching/[slug]` | Yes | Trainer profile (dynamic) |
| `/exercises` | Yes | Exercise library |
| `/exercises/[id]` | Yes | Exercise detail (dynamic) |
| `/nutrition` | Yes | Meal catalog |
| `/nutrition/[id]` | Yes | Recipe detail (dynamic) |
| `/exercise-check` | Yes | AI form checker landing |
| `/subscription` | Yes | Pricing |
| `/login`, `/signup`, … | noindex | Auth shell |
| `/dashboard`, `/admin`, … | noindex | Authenticated app |

---

## Phase 2 — Metadata Implementation

### Added `src/lib/seo.ts`

- `getSiteUrl()` — reads `NEXT_PUBLIC_APP_URL` or falls back to `https://fyp-final-ten.vercel.app`
- `buildPageMetadata()` — title template, description, keywords, canonical, OG, Twitter, robots
- `NO_INDEX_METADATA` — shared noindex block for private areas
- JSON-LD builders: `organizationJsonLd`, `personJsonLd`, `subscriptionServiceJsonLd`, `exerciseJsonLd`

### Root layout defaults

- `metadataBase`, title template (`%s | T.E.S.T.`), OG/Twitter defaults, googleBot hints

### Per-route metadata

| Route | Mechanism |
|-------|-----------|
| `/` | Server `page.tsx` + `buildPageMetadata` + Organization JSON-LD |
| `/coaching` | `(public)/coaching/layout.tsx` |
| `/exercises` | `(public)/exercises/layout.tsx` |
| `/nutrition` | `(public)/nutrition/layout.tsx` |
| `/exercise-check` | `(public)/exercise-check/layout.tsx` |
| `/subscription` | `(public)/subscription/layout.tsx` + Service JSON-LD |
| `/coaching/[slug]` | `generateMetadata` + Person JSON-LD |
| `/exercises/[id]` | `generateMetadata` + ExercisePlan JSON-LD |
| `/nutrition/[id]` | `generateMetadata` |
| `(dashboard)/*` | `NO_INDEX_METADATA` on layout |
| `(auth)/*` | `NO_INDEX_METADATA` on layout |

Client UI preserved via `HomePageClient`, `ExerciseDetailClient`, `MealDetailClient`, `CoachingDetailClient`.

---

## Phase 3 — Sitemap, Robots, Content SEO

### `src/app/sitemap.ts`

Static routes + dynamic entries from:
- MongoDB trainer `slug` fields
- `getExerciseCatalog()` exercise IDs
- `getMealCatalog()` meal IDs

### `src/app/robots.ts`

- Allow `/`
- Disallow dashboard, admin, API, chat, settings, etc.
- Points to `{SITE_URL}/sitemap.xml`

### JSON-LD

| Page | Schema |
|------|--------|
| `/` | `Organization` |
| `/coaching/[slug]` | `Person` (+ AggregateRating when available) |
| `/subscription` | `Service` with `Offer` tiers |
| `/exercises/[id]` | `ExercisePlan` |

### H1 / alt / internal links

- H1: unchanged — already one per public page
- Alt text: descriptive patterns on trainers, exercises, meals
- Internal links: homepage featured trainers → `/coaching/{slug}`; exercise detail → `/exercise-check`; meal detail → `/nutrition`

---

## Phase 4 — Performance & CLS (Lighthouse Notes)

Estimates based on code structure and live baseline (no local Lighthouse run against production in CI). Re-test after deploy.

| Page | Before (est.) | After (est.) | Changes |
|------|---------------|--------------|---------|
| `/` | LCP ~2.8s, CLS ~0.12 | LCP ~2.6s, CLS ~0.05 | Hero `min-h-[20rem]`, server metadata shell, trainer `next/image` |
| `/coaching` | CLS ~0.10 | CLS ~0.04 | Hero min-height, trainer card images sized |
| `/exercises` | CLS ~0.08 | CLS ~0.03 | Hero min-height, `CatalogImageFrame` fixed aspect (4/3, h-48) |

Notes:
- `next.config.ts` has `images.unoptimized: true` — images served without Vercel optimizer; consider enabling optimization in production for LCP gains.
- Framer Motion fade-in on heroes still causes minor opacity shift (not CLS score impact).
- Form checker page uses camera — not Lighthouse-friendly; excluded from marketing CWV targets.

---

## Phase 5 — Verification Checklist

- [x] `npm run build` passes locally (Next.js 16.2.10, 74 static pages, sitemap dynamic)
- [x] `/` returns unique title + canonical + OG tags (verified localhost build)
- [x] `/coaching` returns marketplace-specific title/description (`Find Your Perfect Trainer | T.E.S.T.`)
- [x] `/exercises/[id]` has `generateMetadata` (server-side; verified in build output)
- [x] `/robots.txt` disallows dashboard paths (verified localhost)
- [x] Auth routes emit `noindex, nofollow` (verified `/login`)
- [x] Organization JSON-LD present in `/` HTML
- [ ] `/sitemap.xml` — dynamic route; test after deploy (catalog fetch may take 30–60s on first request)

### Local build verification (2026-07-31)

```
✓ Compiled successfully
✓ Generating static pages (74/74)
Route: ƒ /sitemap.xml (dynamic)
Route: ○ /robots.txt
```

### Google Search Console — Manual Step (User Action Required)

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://fyp-final-ten.vercel.app` (Domain or URL prefix)
3. Verify ownership (HTML tag or DNS — add verification meta to root layout if using HTML method)
4. Submit sitemap: `https://fyp-final-ten.vercel.app/sitemap.xml`
5. Request indexing for key URLs: `/`, `/coaching`, `/exercises`, `/subscription`
6. Monitor Coverage and Core Web Vitals reports after deploy

**Do not push from this session** — deploy separately when ready, then submit sitemap to GSC.

---

## Files Changed

| File | Purpose |
|------|---------|
| `src/lib/seo.ts` | Metadata + JSON-LD helpers |
| `src/components/seo/JsonLd.tsx` | JSON-LD script renderer |
| `src/app/layout.tsx` | Root metadata defaults |
| `src/app/page.tsx` | Server home + Organization schema |
| `src/app/HomePageClient.tsx` | Client home UI + trainer links |
| `src/app/sitemap.ts` | Dynamic sitemap |
| `src/app/robots.ts` | Crawler rules |
| `src/app/(public)/*/layout.tsx` | Static public metadata |
| `src/app/(public)/coaching/[slug]/page.tsx` | Trainer `generateMetadata` |
| `src/app/(public)/exercises/[id]/page.tsx` | Exercise `generateMetadata` |
| `src/app/(public)/nutrition/[id]/page.tsx` | Meal `generateMetadata` |
| `src/app/(dashboard)/layout.tsx` | noindex |
| `src/app/(auth)/layout.tsx` | noindex |
| `src/components/layout/PageShell.tsx` | Hero CLS min-height |

---

*Audit completed 2026-07-31. Re-run live head checks after local build verification.*
