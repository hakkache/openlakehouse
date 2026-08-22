# 02 — Authentication with Keycloak

**Content type: CURRENT PLATFORM CAPABILITY (verified).**

## Hands-On Walkthrough — manage real users/roles in Keycloak's admin console

1. Open Keycloak directly: `http://localhost:8180` (or your actual
   compose-mapped port) → log in as the realm admin.
2. **Users** → confirm the 4 real demo users from
   `realm-export.json` exist (`admin.user`, the data-engineer user, the
   data-analyst user, `viewer.user`).
3. Create a genuinely new user, `intern.user`, assign it the `VIEWER`
   role only, set a temporary password.
4. Log into the OpenLakehouse app as `intern.user`. **Expected result**:
   full read access to pages like Lineage/Dashboards, but write actions
   (e.g. creating a pipeline) are blocked — confirmed by attempting to
   click **New Pipeline** and observing either a disabled button or a
   real `403` from the API (check the Network tab).
5. Confirm token expiry is real: wait past the access token's real
   expiry (check the decoded JWT's `exp` claim from doc 01, typically
   5-15 minutes), then perform an action. **Expected result**: the
   frontend transparently uses its real refresh-token flow to get a new
   access token (visible as a `POST` to Keycloak's token endpoint in the
   Network tab) — no forced re-login for a normal session.

> 🧪 — you created a real new user with a specific role and confirmed
> its permission boundary and token-refresh behavior are both genuinely
> enforced, not simulated.

## Next document

[`03-authorization-and-rbac.md`](03-authorization-and-rbac.md).
