# Settings Functionality Audit

Audit date: 2026-08-07  
Scope: `/settings` for all roles (`user`, `trainer`, `gym_owner`, `admin`, `super_admin`)

## Legend

- ✅ Now functional — persists to DB and affects behavior where applicable
- ✅ Intentionally static — informational/navigation only by design
- ⚠️ Needs your decision — larger feature not built without approval

---

## User (`role: user`)

| Tab | Control | Before | After |
|-----|---------|--------|-------|
| Profile | Full name, country, bio, avatar upload | ✅ Functional | ✅ Functional |
| Profile | Email field | ✅ Read-only (by design) | ✅ Intentionally static |
| Fitness Goals | Goal, activity, weights, save | ✅ Functional | ✅ Functional |
| Notifications | 9 preference toggles + save | ❌ Cosmetic toggles | ✅ Functional — `PUT /api/user/notification-preferences` |
| Security | Change password | ✅ Functional | ✅ Functional |
| Security | Active Sessions list | ❌ Static placeholder | ✅ Intentionally static — single session cookie auth; no device registry yet |
| Account | Theme toggle | ✅ Functional | ✅ Functional |
| Account | Email / role / plan display | ✅ Read-only | ✅ Intentionally static |
| Account | Manage subscription link | ✅ Navigation | ✅ Functional |
| Account | Delete account | ✅ Functional | ✅ Functional |

---

## Trainer (`role: trainer`)

| Tab | Control | Before | After |
|-----|---------|--------|-------|
| Profile | Same as user | ✅ | ✅ |
| Coach Profile | Specialty, experience, certs, rate, bio | ✅ Functional | ✅ Functional |
| Notifications | Preference toggles | ❌ Cosmetic | ✅ Functional (shared prefs API) |
| Security | Password + sessions | ✅ / static sessions | ✅ / ✅ Intentionally static sessions |
| Account | Same as user | ✅ | ✅ |

---

## Gym Owner (`role: gym_owner`)

| Tab | Control | Before | After |
|-----|---------|--------|-------|
| Profile | Same as user (no fitness tab) | ✅ | ✅ |
| Facility | Dashboard/library/chat shortcuts | ✅ Navigation links | ✅ Intentionally static — navigation shortcuts to real pages |
| Notifications | Preference toggles | ❌ Cosmetic | ✅ Functional |
| Security | Password + sessions | ✅ / static | ✅ / ✅ Intentionally static sessions |
| Account | Same as user | ✅ | ✅ |

---

## Admin (`role: admin`)

| Tab | Control | Before | After |
|-----|---------|--------|-------|
| Profile | Same as user (no fitness tab) | ✅ | ✅ |
| Admin Controls | Console shortcut links | ✅ Navigation | ✅ Intentionally static — links to real admin modules |
| Admin Controls | 4 admin notification toggles | ❌ Cosmetic | ✅ Functional — stored in same `notificationPreferences` |
| Admin Controls | Safe admin tools notice | ✅ Informational | ✅ Intentionally static |
| Notifications | User-facing toggles | ❌ Cosmetic | ✅ Functional |
| Security / Account | Same as user | ✅ | ✅ |

---

## Super Admin (`role: super_admin`)

Same tab layout as admin. All items above apply identically.

---

## Backend added

- **User schema:** `notificationPreferences` object (14 boolean keys, all default `true`)
- **API:** `GET/PUT /api/user/notification-preferences`
- **Behavior:** `createNotification()` checks preferences via `resolvePreferenceKey()` before creating in-app notifications

### Preference → notification mapping

| Preference key | Suppresses when `false` |
|----------------|-------------------------|
| `chatMessages` | Chat messages |
| `workoutPlans` | Workout plan assignments |
| `mealPlans` | Meal plan assignments |
| `connectionRequests` | Trainer connection/review alerts |
| `liveSessions` | Live session scheduling |
| `communityActivity` | Community likes/comments |
| `subscriptionUpdates` | Subscription/payment notifications |
| `achievements` | Achievement/badge notifications |
| `weeklyProgress` | Weekly progress summaries |
| `adminTrainerApplications` | Trainer verification alerts (admin) |
| `adminGymVerification` | Gym verification alerts (admin) |
| `adminUserSuspension` | Suspension/moderation alerts (admin) |
| `adminSubscriptionUpgrades` | Subscription change alerts (admin) |

---

## Flagged for your decision

| Item | Reason |
|------|--------|
| **Multi-device active session management** | Would need session/device registry, refresh tokens, and revoke-by-device API — out of scope unless you want full session management |
| **Weekly progress report cron** | Preference exists; no scheduled job sends weekly emails yet — toggle saves but no cron triggers it |
| **Push notification delivery** | Expo push tokens exist on User; preferences gate in-app notifications only, not push yet |
