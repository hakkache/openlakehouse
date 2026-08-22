# 03 — Authorization and RBAC

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`app.core.security.requires_elevated_role` and its usages).**

## Hands-On Walkthrough — verify real role-gating with 2 users side by side

1. Log in as `admin.user` in one browser (or profile), a
   `DATA_ENGINEER`-role user in another.
2. Both attempt to build a pipeline with a `python`/`pyspark` code node
   (module 05 doc 08). **Expected result**: both succeed — the elevated-
   role check permits `ADMIN` **and** `DATA_ENGINEER`, per
   `requires_elevated_role()`'s real logic.
3. Log in as the `DATA_ANALYST`-role user, attempt the same. **Expected
   result**: a real `403 Forbidden` from the compile/run endpoint —
   confirm in the Network tab that this is a genuine server-side
   rejection (not merely a hidden UI button), by directly calling the API
   (e.g. via `curl` with that user's bearer token) and observing the same
   `403`.
4. Log in as `viewer.user`, confirm read-only enforcement: attempt any
   `POST`/`PUT`/`DELETE` endpoint directly via `curl` with this user's
   token (e.g. `POST /v1/pipelines`). **Expected result**: `403` — even
   though the frontend UI might not expose the button at all, the real
   enforcement is server-side, confirmed by bypassing the UI entirely.

## Why testing via direct API calls (not just UI clicks) matters

A real security boundary must be enforced at the API layer — a UI that
merely hides a button is not real authorization. Step 4's direct `curl`
test is the only way to genuinely confirm this, and is exactly the kind
of test a real security review would perform.

> 🧪 **Checkpoint**: you confirmed role enforcement holds even when
> bypassing the UI and calling the API directly with a lower-privileged
> user's real token.

## Next document

[`04-secrets-and-encryption.md`](04-secrets-and-encryption.md).
