# 05 — Security Incidents

**Content type: PROJECT IMPLEMENTATION.** Closes the module with 2 full
security-incident response cycles.

## Incident 1 — a leaked/compromised connection password

1. Simulate: assume a stored Connection's password (module 18) may have
   been exposed (e.g. via a leaked backup, hypothetical for this
   exercise).
2. **Respond**: rotate the real credential at the source system (change
   the actual Postgres user's password), update the Connection's stored
   value via the app (re-encrypts automatically per
   [`16-security/04-secrets-and-encryption.md`](../16-security/04-secrets-and-encryption.md)),
   re-test the connection to confirm the new credential works.
3. **Harden**: consider rotating `backend_secret_key` too (noting the
   real re-encryption-migration requirement flagged in that same
   document) if you suspect the encryption key itself, not just one
   credential, was exposed.

## Incident 2 — a user's access needs immediate revocation

4. Simulate: a `DATA_ENGINEER`-role user's account needs immediate
   access revocation (e.g. offboarding).
5. **Respond**: in Keycloak's admin console (module 16 doc 02), disable
   the user account directly (**Users** → select user → toggle
   **Enabled** off).
6. **Verify real, immediate effect**: attempt to use that user's
   existing (not-yet-expired) access token against the API. **Expected
   result**: still works until the token's own `exp` claim passes (a
   real, important limitation — disabling a Keycloak user does **not**
   instantly invalidate already-issued JWTs) — confirm this yourself,
   then wait for/force token expiry and re-test: **now** rejected.
7. **Document this limitation** as a real finding: immediate revocation
   requires either short-lived tokens (verify your realm's actual access
   token lifetime) or explicit token revocation/introspection — note
   which mitigation this project's real Keycloak realm config currently
   relies on.

> 🧪 **Checkpoint for the module**: you completed a credential-rotation
> incident and a user-revocation incident, and personally discovered and
> documented the real (not hypothetical) gap between "disabling a user"
> and "invalidating their current session token."

## Next module

[`22-capstone/01-24-phase-capstone-project.md`](../22-capstone/01-24-phase-capstone-project.md).
