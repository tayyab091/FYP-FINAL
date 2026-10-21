# Theme & Landing UI Audit

Audit date: 2026-08-07  
Scope: Task 1 (landing pricing + trainer scroll) and Task 2 (exercises/nutrition light mode + theme sweep)  
Branch: `musadiq` (local commits, not pushed)

## Legend

- ✅ Fixed — implemented and build-verified
- ✅ Intentionally unchanged — correct behavior by design
- ⚠️ Deferred — out of scope or needs separate decision

---

## Task 1 — Landing Page

**Commit:** `cf81923` — *Fix landing pricing dark mode and trainer card mouse scroll*

### BUG 1.1 — Premium/Elite plan card dark mode

| Item | Before | After | Files |
|------|--------|-------|-------|
| Elite card name/price text in dark mode | Low contrast / inconsistent with Basic & Pro | Explicit `var(--foreground)` on `.landing-pricing__name` and `.landing-pricing__price` | `src/app/globals.css` |
| Elite feature list text | Inherited poorly on gradient fill | Explicit `var(--muted-foreground)` on `.landing-pricing__feature` | `src/app/globals.css` |
| Elite checkmarks in dark mode | Inconsistent | `var(--primary)` under `.dark .landing-pricing__card--elite` | `src/app/globals.css` |
| Card clipping from `scale(1.03)` | Text could clip at grid edges | `overflow: visible` on `.landing-pricing__grid` and `.landing-pricing__cell` | `src/app/globals.css` |
| Featured gold/purple border styling | Present | **Preserved** — only readability/consistency fixed, not the highlight design | — |

**Root cause:** Elite card used a custom multi-layer `background` (gradient border-box) without binding typography to theme tokens. Basic/Pro cards inherited readable colors via `.dark .landing-pricing__card`; Elite did not.

**Light mode:** No change required — Elite already read correctly in light mode.

---

### BUG 1.2 — Trainer cards not scrollable with mouse

| Item | Before | After | Files |
|------|--------|-------|-------|
| Vertical mouse wheel over carousel | Did not scroll horizontally | `useHorizontalWheelScroll` maps `deltaY` → `scrollLeft` | `src/hooks/useHorizontalWheelScroll.ts`, `LandingTrainers.tsx` |
| Scrollbar visibility | Hidden (`scrollbar-width: none`) | Thin visible scrollbar on hover/scroll | `src/app/globals.css` |
| Click-drag affordance | None | `cursor: grab` / `grabbing` on scroll wrap | `src/app/globals.css` |
| Native overflow scroll | `overflow-x: auto` (correct) | Unchanged — still the base mechanism | `src/app/globals.css` |

**Root cause:** Container had correct `overflow-x: auto` but (1) vertical wheel events don't scroll horizontal axes by default, and (2) hidden scrollbar made mouse interaction undiscoverable.

**Other horizontal sections checked:**

| Section | Pattern | Status |
|---------|---------|--------|
| Featured trainers (`LandingTrainers`) | Native horizontal scroll | ✅ Fixed |
| Level Up / How it works (`LandingHowItWorks`) | Vertical step grid, not horizontal carousel | ✅ N/A — not a scroll row |
| Marquee (`LandingMarquee`) | CSS infinite animation | ✅ Intentionally unchanged — auto-scroll, not user-driven |
| Admin tab bar | `overflow-x-auto` on tabs | ✅ Works with native overflow (no wheel remap needed) |

---

## Task 2 — Light Mode Rendering (Exercises + Nutrition)

**Commit:** `0964f13` — *Fix light-mode styling for exercise and nutrition preview panels*

### BUG 2.1 — Exercise "View Instructions" panel stuck in dark styling

| Item | Before | After | Files |
|------|--------|-------|-------|
| Expandable panel shell | `bg-black/45` in all themes | `bg-card/95` light, `dark:bg-black/45` dark | `ExpandableCardPanel.tsx` |
| Badge colors (muscle, difficulty) | Dark-only (`text-green-400`, etc.) | Light/dark pairs (`text-green-700 dark:text-green-400`) | `ExerciseMoreInfoPanel.tsx` |
| Target muscle chips | `text-emerald-300` only | `text-emerald-800 dark:text-emerald-300` | `ExerciseMoreInfoPanel.tsx` |
| CTA link | Dark emerald only | Theme-aware emerald shades | `ExerciseMoreInfoPanel.tsx` |
| Catalog card badges | Dark-only muscle/difficulty colors | Light/dark pairs | `exercises/page.tsx` |
| FitnessBadge component | `text-sky-300` / `text-yellow-300` | Theme-aware variants | `FitnessBadge.tsx` |

**Root cause:** `ExpandableCardPanel` hardcoded a dark glass background; child panels used Tailwind colors tuned for dark backgrounds (`*-300`/`*-400` on transparent tints).

---

### BUG 2.2 — Nutrition preview text not showing properly in light mode

| Item | Before | After | Files |
|------|--------|-------|-------|
| Expandable panel shell | Same `bg-black/45` issue | Shared fix via `ExpandableCardPanel` | `ExpandableCardPanel.tsx` |
| Category badge in panel | `text-primary` on tinted bg | `text-foreground` on `bg-muted/60` | `DishMoreInfoPanel.tsx` |
| Ingredient chips | `text-primary/80` emphasis | `text-foreground/80` + muted borders | `DishMoreInfoPanel.tsx` |
| Ingredient count chip | `text-sky-300` only | `text-sky-800 dark:text-sky-300` | `DishMoreInfoPanel.tsx` |

**Root cause:** Same as 2.1 — parent dark shell + light-text-only child tokens.

---

### BUG 2.3 — Category text purple on nutrition dish cards (light mode)

| Item | Before | After | Files |
|------|--------|-------|-------|
| Category overlay on catalog cards | `bg-black/60` + `text-primary` (purple in light theme) | `bg-background/85` + `text-foreground` | `nutrition/page.tsx` |
| Category on meal detail hero | Same pattern | Same fix | `nutrition/[id]/MealDetailClient.tsx` |

**Root cause:** `text-primary` is intentionally purple in light mode (`--primary: #7c3aed`). On a dark `bg-black/60` pill it clashed and looked like a bug; switched to neutral theme foreground on a light glass badge.

**Dark mode:** Unchanged readability — `text-foreground` remains correct.

---

## Broader Theme-Consistency Sweep

Searched for hardcoded dark colors in expandable panels/cards and related catalog UI.

| Location | Pattern | Action |
|----------|---------|--------|
| `ExpandableCardPanel.tsx` | `bg-black/45` | ✅ Fixed |
| `ExerciseMoreInfoPanel.tsx` | Dark-only accent text | ✅ Fixed |
| `DishMoreInfoPanel.tsx` | Dark-only accent text | ✅ Fixed |
| `exercises/page.tsx` | `MUSCLE_COLORS` / `DIFFICULTY_COLORS` | ✅ Fixed |
| `FitnessBadge.tsx` | `text-sky-300`, `text-yellow-300` | ✅ Fixed |
| `nutrition/page.tsx` + `MealDetailClient.tsx` | Category overlay badges | ✅ Fixed |
| `dialog.tsx`, `Navbar.tsx`, `DashboardShell.tsx` | `bg-black/70` modal backdrops | ✅ Intentionally unchanged — dim overlays work in both themes |
| `my-fitness/MyFitnessInner.tsx` | `bg-black/60` sheet backdrop | ✅ Intentionally unchanged |
| `live-sessions/page.tsx` | `bg-black/40` on form inputs inside schedule modal | ⚠️ Deferred — dashboard modal inputs, not catalog expandable panels; can align to `bg-card` in a follow-up if desired |

`ExpandableCardPanel` is only used on `/exercises` and `/nutrition` — both fixed.

---

## Build & Verification

| Check | Status |
|-------|--------|
| `npm run build` | ✅ Passes (79 routes) |
| Playwright viewport test (trainer dashboard) | ✅ From prior commit `adaeb85` — unrelated to Tasks 1–2 |
| Browser visual confirmation | ⏳ Pending your sign-off |
| Debug instrumentation | Still present in `LandingPricing.tsx`, `LandingTrainers.tsx`, `ExpandableCardPanel.tsx` — remove after you confirm fixes in browser |

---

## Manual Test Checklist

### Task 1
1. `/` → dark mode → Pricing → Elite card: name, price, features readable; matches Basic/Pro tone
2. `/` → light mode → Pricing → all three cards still correct
3. `/` → Featured coaches → mouse wheel scrolls row horizontally; scrollbar visible

### Task 2
4. `/exercises` → light mode → "View Instructions" → light panel, readable badges/text
5. `/exercises` → dark mode → same panel still correct
6. `/nutrition` → light mode → category badges on cards are neutral (not purple-on-dark)
7. `/nutrition` → expand dish preview → readable ingredients/steps in light mode
