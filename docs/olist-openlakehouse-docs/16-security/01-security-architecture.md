# 01 — Security Architecture

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`infra/keycloak/realm-export.json`, `backend/app/core/keycloak.py`,
`backend/app/core/crypto.py`).**

## Real architecture: Keycloak SSO + JWT + role-based backend authorization

**Verified real roles** (from `realm-export.json`): `ADMIN`,
`DATA_ENGINEER`, `DATA_ANALYST`, `VIEWER` — each with a real demo user
(`admin.user`, a data-engineer user, a data-analyst user, `viewer.user`).
The backend's `get_current_user` dependency validates a real Keycloak-
issued JWT on every request; role-gated endpoints (e.g. `python`/`pyspark`
code nodes, per
[`05-pipeline-builder/08-python-pyspark-sql.md`](../05-pipeline-builder/08-python-pyspark-sql.md))
check `requires_elevated_role()` against the JWT's real roles claim.

**Verified secrets-at-rest mechanism**: `crypto.py` uses Fernet symmetric
encryption (AES-128-CBC+HMAC) keyed from `backend_secret_key`, applied to
Connection Management passwords (module 18) — encrypted values are never
returned by any API response, per the module's own docstring.

## Hands-On Walkthrough — confirm the real login flow

1. Log out of the app if logged in, navigate to `http://localhost`.
2. **Expected result**: redirected to Keycloak's real login page (not a
   custom in-app login form) — confirms Keycloak SSO, not a homegrown
   auth system.
3. Log in as `viewer.user`. Open browser dev tools, inspect the stored
   JWT (Application → Local Storage/Session Storage, depending on the
   frontend's token storage). **Expected result**: a real JWT with a
   `realm_access.roles` claim containing `["VIEWER"]` — decode it at
   `jwt.io` (paste only the token, never a real production secret) to
   confirm.

> 🧪 **Checkpoint**: you found a real JWT with the exact `VIEWER` role
> claim after logging in as that user, confirming Keycloak is the real
> source of identity/roles for this platform.

## Next document

[`02-authentication-keycloak.md`](02-authentication-keycloak.md).
