# 02 — Keycloak Roles and Login

**Verified from `infra/keycloak/realm-export.json`.**

## The real role matrix

| Role | Real permission boundary | Demo user |
|---|---|---|
| `ADMIN` | Full access, including elevated pipeline code nodes and platform admin pages | `admin.user` |
| `DATA_ENGINEER` | Build/run pipelines, jobs, notebooks, elevated `python`/`pyspark` code nodes | (data-engineer demo user) |
| `DATA_ANALYST` | Build/run non-elevated pipelines, BI, SQL Editor | (data-analyst demo user) |
| `VIEWER` | Read-only across the app | `viewer.user` |

## Hands-On Walkthrough — log in and inspect your real JWT

1. Open `http://localhost`. **Expected result**: redirected to
   Keycloak's real login page (not an app-native form) — confirms the
   SSO wiring from module 01.
2. Log in as `admin.user`.
3. Open browser dev tools → Application/Storage → find the stored access
   token. Copy it into `https://jwt.io` (decode only — never paste a
   real production secret here). **Expected result**: a real JWT with
   `realm_access.roles` containing `"ADMIN"`, a real `exp` (expiry)
   timestamp a few minutes in the future, and a real `preferred_username`
   of `admin.user`.
4. Log out, log back in as `viewer.user`, repeat the JWT decode.
   **Expected result**: `realm_access.roles` now contains `"VIEWER"`
   instead — a directly observable, real difference between the two
   accounts, not just a UI label.

## Negative test — a role mismatch, caught immediately

5. While logged in as `viewer.user`, try to open a page you'd expect to
   be restricted (e.g. **Pipelines → New Pipeline**). **Expected
   result**: either the control is hidden/disabled, or attempting the
   underlying action returns a real `403` — confirm which, since this
   distinction (UI-hidden vs. server-enforced) matters for module 16's
   security deep dive.

> 🧪 **Checkpoint**: logged in as 2 different real users, decoded 2 real
> JWTs, and confirmed their `realm_access.roles` differ exactly as this
> table predicts.

## Next document

[`03-first-tour-and-first-query.md`](03-first-tour-and-first-query.md).
