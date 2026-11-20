# File changes and starting line numbers

## Latest: gym trainers and nearby map

- `src/lib/gym-trainers.ts:6` — Load current approved public trainer profiles for each gym and correct stale trainer counts.
- `src/components/gyms/GymTrainers.tsx:5` — Show linked trainer names/photos on cards, public profiles, and trainer My Gym.
- `src/lib/gym-map.ts:6` — Keep the default map neutral at COMSATS Lahore and search gyms at the supplied current location.
- `src/components/gyms/GoogleGymMap.tsx:19` — Use the shared map target and accurate campus/nearby titles.
- `src/app/(public)/gyms/page.tsx:195` — Remove automatic first-gym selection and reset selection when requesting nearby gyms.
- `next.config.ts:32` — Allow the existing OpenStreetMap embed through the frame policy.

## Earlier changes

- `src/lib/osm-gyms.ts:7` — Fetch and normalize key-free OpenStreetMap gym listings with caching, radius checks, and timeouts.
- `src/app/api/gyms/nearby/route.ts:25` — Use OpenStreetMap when Google is absent or fails, with a neutral registered-gym fallback.
- `src/app/(public)/gyms/page.tsx:27` — Distinguish registered and external gyms, filter both sources, and remove the Google configuration warning.
- `src/lib/gym-discovery.ts:7` — Merge nearby results, remove duplicate physical gyms, and sort by distance.
- `src/lib/gyms.ts:4` — Support Google/OpenStreetMap source information and linked Google Place IDs.
- `src/components/gyms/GoogleGymMap.tsx:20` — Display OpenStreetMap embeds for community-mapped gyms and Google Maps for other profiles.
- `src/components/layout/DashboardRouteShell.tsx:9` — Keep the public navbar on guest/homepage Form Checker visits and retain dashboard navigation elsewhere.
- `src/app/(dashboard)/layout.tsx:8` — Select the appropriate public or dashboard shell for the Form Checker.
- `src/components/layout/Navbar.tsx:22` — Preserve homepage navigation context and highlight Form Checker links correctly.
- `src/components/layout/SiteFooter.tsx:14` — Open Form Checker with the public navigation context from the footer.
- `src/components/landing/LandingExperience.tsx:67` — Keep the public navbar when opening Form Checker from the homepage animation.
- `src/app/(dashboard)/trainer-dashboard/my-gym/page.tsx:53` — Add connected-gym star reviews and update displayed rating totals after submission.
- `src/components/gyms/GymReviews.tsx:48` — Show the review form only when the server confirms review eligibility.
- `src/app/api/gyms/[slug]/reviews/route.ts:34` — Allow approved connected trainers to review their gym while blocking unrelated, self, and duplicate reviews.
- `src/components/legal/LegalDocumentPage.tsx:43` — Explain map-provider location use and show OpenStreetMap licensing/privacy links.
- `tests/core/gym-discovery.test.ts:39` — Cover key-free discovery, provider failures, map normalization, radius checks, and photo security.
- `tests/core/trainer-gym-reviews.test.ts:31` — Test approved trainer reviews, unconnected trainers, own-gym restrictions, and duplicate submissions.
- `docs/google-places-setup.md:3` — Explain that nearby search no longer requires Google and retain the optional Google photo setup steps.
- `deliverables/T.E.S.T.-Viva.pptx` — Include the previously created 26-slide viva presentation in GitHub (binary file; no source line number).

## Previous release, also included on both branches

- `src/components/landing/LandingHero.tsx:19` — Remove repeated hero slogans and shorten the homepage introduction.
- `src/components/landing/LandingTrainingWorlds.tsx:18` — Remove repeated section and image-card descriptions.
- `src/components/landing/LandingExperience.tsx:24` — Shorten method/form-check descriptions and remove extra recovery and FAQ text.
- `src/app/(dashboard)/gym-owner/page.tsx:342` — Add an optional Google Place ID field to gym settings.
- `src/app/api/gym-owner/gym/route.ts:74` — Save the gym owner's Google Place ID without changing uploaded images.
- `src/models/Gym.ts:22` — Store an optional Google Place ID for exact business-photo matching.
- `src/lib/validation.ts:387` — Validate Google Place IDs and reject Maps URLs in that field.
- `src/lib/google-gym-photos.ts:8` — Create short-lived signed photo requests with source and author attribution.
- `src/app/api/gyms/photo/route.ts:5` — Stream valid Google photo requests without exposing the server key.
- `src/app/api/gyms/google-photo/route.ts:7` — Retrieve photos only for a saved verified gym's linked Place ID.
- `src/hooks/useGymGooglePhoto.ts:5` — Load optional Google covers while preserving existing images as fallback.
- `src/components/gyms/GooglePhotoAttribution.tsx:8` — Display Google branding and photo-author/source credits.
- `src/app/(public)/gyms/[slug]/page.tsx:76` — Show a linked gym's Google cover and recover to its existing cover if it fails.
- `src/lib/legal-content.ts:1` — Update the policy revision date for map integration disclosures.
