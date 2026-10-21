# Trainer UI Audit Results

**Date:** 2026-08-07T10:14:55.751Z
**Test account:** trainer-ui-1786097532927@test.com

| # | Test | Status | Detail |
|---|------|--------|--------|
| 1 | Create trainer account (UI) | ✅ | Registered trainer-ui-1786097532927@test.com |
| 2 | Availability save & show | ✅ | Monday start persisted as 10:30 |
| 3 | Profile Information save | ✅ | Name persisted: UI Trainer Updated |
| 4 | Coach Profile save | ✅ | Specialty persisted |
| 5 | Fitness Goals save | ✅ | Weights persisted (75 / 70 kg) |
| 6 | Notification Preferences | ✅ | Toggle changed true → false and persisted |
| 7 | Password change (Security) | ✅ | Logged in with new password after change |
| 8 | Account suspension | ✅ | Admin suspended; trainer login blocked with message |
| 9 | Account deletion | ✅ | Account deleted; subsequent login fails |

Screenshots: `e2e/screenshots/trainer-ui-audit/`
