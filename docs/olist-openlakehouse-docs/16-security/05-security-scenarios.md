# 05 — Security Scenarios

**Content type: PROJECT IMPLEMENTATION.** Closes the module with 3
concrete negative-test scenarios exercising real security boundaries.

## Scenario A — expired/tampered JWT rejected

1. Take a valid JWT (from any logged-in user's browser storage, per
   [`01-security-architecture.md`](01-security-architecture.md)), modify
   one character in its signature portion, and call any authenticated
   API endpoint with it directly (`curl -H "Authorization: Bearer
   <tampered-token>" http://localhost/v1/pipelines`).
2. **Expected result**: a real `401 Unauthorized` — the backend's JWT
   signature verification genuinely rejects a tampered token, not merely
   a client-side check.

## Scenario B — cross-user data isolation (if applicable to this schema)

3. Log in as two different non-admin users, each create a
   Connection/Pipeline. Confirm whether each user can see the other's
   objects (this project's real data model may or may not scope
   pipelines per-user — verify by checking
   `backend/app/models/pipeline.py` for a `created_by`/`owner_id` column
   and whether list endpoints filter by it). **Expected result**:
   document exactly what you find — either real per-user isolation, or a
   documented shared-workspace model (both are legitimate designs; the
   point is verifying which one this platform actually implements,
   rather than assuming).

## Scenario C — SQL injection resistance in Pipeline Builder's `code:sql` node

4. Attempt a deliberately malicious `code:sql` node value:
   `SELECT * FROM orders; DROP TABLE orders; --`. **Expected result**:
   Trino's own statement-per-execution model (no multi-statement batch
   execution over one connection call) means the second statement never
   executes — verify `orders` still exists afterward. This is a real
   property of how the backend issues one query per execution call, not
   a custom-built defense.

> 🧪 **Checkpoint for the module**: you confirmed 3 real security
> properties — signature-verified JWTs, an honestly-documented data-
> isolation model, and injection resistance from Trino's own execution
> model — each proven with an actual attempted exploit, not assumed.

## Next module

[`17-devops-and-version-control/01-gitea-and-git-workflow.md`](../17-devops-and-version-control/01-gitea-and-git-workflow.md).
