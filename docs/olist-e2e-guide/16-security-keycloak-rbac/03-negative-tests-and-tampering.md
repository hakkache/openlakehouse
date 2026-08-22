# 03 — Negative Tests: Tampering and Elevated-Role Gating

## Scenario 3 (Complex) — a tampered token is really rejected

1. Take a real valid token, flip one character in its signature
   segment, replay it against a real API call. **Expected result**: a
   real `401` (signature validation genuinely fails — this is not just a
   client-side check).

## Scenario 4 (Complex) — a locally-forged "admin" claim is really rejected

2. Manually construct a JWT with `realm_access.roles: ["ADMIN"]` signed
   with your own arbitrary key (not Keycloak's real signing key), replay
   it. **Expected result**: real `401` — the backend verifies the
   signature against Keycloak's real JWKS, so a self-signed forged claim
   is provably useless without Keycloak's private key.

## Negative-test summary

| Attack attempt | Real result |
|---|---|
| Flip 1 char in a valid signature | 401 |
| Self-signed forged "ADMIN" claim | 401 |
| Expired token replay | 401 |
| Valid token, insufficient role, elevated action | 403 |

> 🧪 **Checkpoint**: reproduced both a tampered-signature rejection and a
> forged-claim rejection, confirming the backend performs real
> cryptographic verification, not just claim-string matching.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../17-gitea-version-control-cicd/00-index.md`](../17-gitea-version-control-cicd/00-index.md).
