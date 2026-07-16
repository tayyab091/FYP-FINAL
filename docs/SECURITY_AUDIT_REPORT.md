# Security Audit Report

**Date:** 2026-07-13  
**Branch:** `musadiq`  
**Scope:** NoSQL injection, XSS, AuthZ/IDOR, secrets, rate limits, uploads, CSP  
**Payments:** **PAUSED** — `api/subscription` / `api/webhooks/stripe` not modified; not retested for checkout

---

## Summary

| Area | Before | After | Retest |
|------|--------|-------|--------|
| NoSQL operator injection on auth | Partial (login typed; register weak) | Zod + operator reject on mutating APIs | Login `{email:{$ne:null}}` → **400** |
| XSS stored in UGC | React text nodes OK; no HTML sanitize | Server `sanitizePlainText` + URL allowlist | Community HTML → tags stripped; `javascript:` profile image → **400** |
| CSP / security headers | CORS `*` only | CSP + nosniff + frame/referrer/permissions | Homepage returns CSP |
| Rate limits | None | Auth / AI / upload in-memory limits | Applied on login, register, AI, upload, seed |
| Uploads | Type/size checks in upload helper | + rate limit | Unchanged MIME/size checks |
| Passwords | bcrypt + `.select('-password')` on me/profile | Same; change-password Zod | Live login OK |
| Payments | Stripe simulated | **PAUSED** (untouched) | GET plan fields only |

---

## Findings

### 1. NoSQL injection via JSON body operators — **Fixed (High)**

| | |
|--|--|
| **Location** | Auth register and other routes that used `await req.json()` then passed values into Mongoose filters |
| **Risk** | Operator objects (`$ne`, `$gt`) could bypass type assumptions or cause unexpected query behavior |
| **Fix** | `src/lib/validation.ts` — `assertNoMongoOperators` + Zod schemas; `parseJsonBody` rejects `$` / dotted keys and wrong types (no silent coerce) |
| **Retest** | `POST /api/auth/login` with `{"email":{"$ne":null},"password":"x"}` → `400` `Invalid field "$ne" in body.email` |

### 2. Weak register / profile typing — **Fixed (High)**

| | |
|--|--|
| **Location** | `api/auth/register`, `register-trainer`, `register-gym-owner`, `api/user/profile` |
| **Risk** | Non-string email/password; unrestricted profile URLs |
| **Fix** | Zod email/password/plain-text schemas; profile `profileImage` must be http(s) |
| **Retest** | Register with operator email → 400; profile `javascript:alert(1)` → 400 |

### 3. Stored XSS in free-text — **Mitigated (Medium)**

| | |
|--|--|
| **Location** | Community posts/comments, chat text, trainer bio, reviews |
| **Risk** | If HTML ever rendered with `dangerouslySetInnerHTML`, scripts could run. Repo had **no** `dangerouslySetInnerHTML`; React text nodes are default-safe |
| **Fix** | `sanitizePlainText` strips tags/control chars + length caps; chat images require https URLs; chat UI blocks non-https `img` src |
| **Retest** | Community post with `<script>…</script>` stored as plain text (`alert(1)Hello XSS`); UI renders as text |

### 4. Missing CSP — **Fixed (Medium)**

| | |
|--|--|
| **Location** | `next.config.ts` |
| **Risk** | No browser CSP / clickjacking / MIME sniffing protections |
| **Fix** | Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy; CORS origin tightened off `*` |
| **Retest** | `GET /` includes CSP + `nosniff` |

### 5. Unauthenticated / unlimited AI cost path — **Fixed (Medium)**

| | |
|--|--|
| **Location** | `api/ai/chat` |
| **Risk** | Unauthenticated Gemini spend / abuse |
| **Fix** | Require `getUser`; Zod body; `rateLimitAi` |
| **Retest** | Covered by typecheck + auth gate (live suite does not call AI chat) |

### 6. Auth brute-force / seed abuse — **Mitigated (Medium)**

| | |
|--|--|
| **Location** | login, register, forgot/reset, create-admin, seed |
| **Risk** | Credential stuffing / setup key guessing |
| **Fix** | `rateLimitAuth` (20 / 15 min / IP, in-memory) |
| **Note** | Soft limit (per instance); Redis recommended for multi-instance production |

### 7. Chat upload validation — **Already OK + rate limit (Low)**

| | |
|--|--|
| **Location** | `api/chat/upload`, `lib/cloudinary.ts` |
| **Risk** | Oversized / non-image uploads |
| **Fix** | Existing MIME + 4MB checks; added `rateLimitUpload` |

### 8. IDOR on mutating resources — **Reviewed (Low–Medium residual)**

| | |
|--|--|
| **Location** | Chat (`assertCanChat`), meal-plans (`userId` ownership), workout complete (plan `userId`), gym-owner trainers (gym ownership), admin (role gate) |
| **Risk** | Cross-user access if filters omit ownership |
| **Fix** | Ownership checks retained; ObjectId params validated via `parseObjectIdParam` |
| **Retest** | Live suite ownership paths still pass |

### 9. Secrets with `NEXT_PUBLIC_` — **OK**

Only publishable/client keys: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PUSHER_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. No server secrets publicized.

### 10. Payments / Stripe — **PAUSED (Out of scope)**

Not audited for live Checkout/webhook hardening this phase. Do not treat as verified.

---

## Libraries added

| File | Role |
|------|------|
| `src/lib/validation.ts` | Zod schemas, operator reject, parse helpers |
| `src/lib/sanitize.ts` | Plain-text + http(s) URL sanitization |
| `src/lib/rate-limit.ts` | Fixed-window IP rate limits |

---

## Missing env keys (not invented)

Documented gaps unchanged: `PUSHER_*`, `CLOUDINARY_*`, `SMTP_*`, `GOOGLE_CLIENT_*`, live `STRIPE_*` (**PAUSED**).

---

## Build & live smoke

- `npx tsc --noEmit` — pass  
- `npm run live-verify` — **69/69 pass** (payments GET only)  
- `npm run build` — pass  

---

*Payments remain PAUSED. Prefer this report over assuming unchecked routes are hardened.*
