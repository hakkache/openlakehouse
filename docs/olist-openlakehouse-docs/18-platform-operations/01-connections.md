# 01 — Connections

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`backend/app/core/connection_tester.py`, `backend/app/core/crypto.py`).**

## Real behavior: every "test connection" click performs a genuine live attempt

**Verified from the module's own docstring**: "no simulated/fake
results" — `test_postgresql()` genuinely opens a `psycopg` connection and
runs `SELECT 1`; equivalent real functions exist per connection type
(MySQL, etc.). Every result includes a real measured `latency_ms`.

## Hands-On Walkthrough — create and genuinely test 2 connections

1. Open `http://localhost/connections` → **+ New Connection**, type
   `PostgreSQL`, point it at this project's own real Postgres:
   `host=postgres, port=5432, database=openlakehouse, username=openlakehouse`,
   password = the real one from your `.env`/compose config.
2. Click **Test Connection**. **Expected result**: success, with a real
   measured latency (a few milliseconds, since it's on the same docker
   network) — refresh and re-test to see the latency value genuinely
   fluctuate slightly each time (proof it's a live measurement, not a
   cached constant).
3. Create a **deliberately wrong** connection (bad password). Test it.
   **Expected result**: a real failure message like
   `OperationalError: ...` — the exact real exception type/message from
   `psycopg`, surfaced verbatim per `connection_tester.py`'s `_timed()`
   helper, not a generic "connection failed" string.
4. Confirm the password is encrypted at rest (cross-reference
   [`16-security/04-secrets-and-encryption.md`](../16-security/04-secrets-and-encryption.md)) —
   re-run that document's direct-database check against this connection's
   row.

> 🧪 **Checkpoint**: you saw a real successful test with measured
> latency, and a real, specific failure message from a deliberately
> broken connection — both genuine, not simulated.

## Next document

[`02-compute.md`](02-compute.md).
