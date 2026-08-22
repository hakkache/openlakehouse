# 02 — JWT and Token Lifecycle

## Scenario 1 (Medium) — decode a real token, inspect real claims

1. Capture your real access token (browser dev tools → network tab
   → any authenticated request's `Authorization` header). Decode at
   jwt.io (or `python -c` with `pyjwt`, `verify=False`, for local
   inspection only). **Expected result**: real `realm_access.roles`
   matching the role matrix, a real `exp` claim.

## Scenario 2 (Medium) — real expiry and refresh

2. Note the `exp` timestamp, wait past it (or use a short-lived test
   client), retry the same API call with the now-expired token.
   **Expected result**: real `401`. Use the refresh token to get a new
   access token, retry — succeeds.

| Step | Token state | Expected API result |
|---|---|---|
| Fresh token | valid | 200 |
| Past `exp` | expired | 401 |
| After refresh | valid again | 200 |

> 🧪 **Checkpoint**: decoded 1 real token's claims, and reproduced a real
> 401-on-expiry followed by a successful refresh.

## Next document

[`03-negative-tests-and-tampering.md`](03-negative-tests-and-tampering.md).
