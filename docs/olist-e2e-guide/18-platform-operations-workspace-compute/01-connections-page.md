# 01 — The Connections Page

## Scenario 1 (Simple→Medium) — real connection tests across types

1. Open the app's **Connections** page. For each configured connection
   type (Postgres, Kafka, Trino, etc. per `connection_tester.py`),
   click **Test Connection**. **Expected result**: a real
   success/failure, not a hardcoded green check.
2. **Negative test**: temporarily point one connection at a wrong
   port/host, click **Test Connection** again. **Expected result**: a
   real, specific failure message (e.g. connection refused).

| Connection type | Real test performed |
|---|---|
| Postgres | real `SELECT 1` via a live connection |
| Kafka | real broker metadata fetch |
| Trino | real catalog listing query |

> 🧪 **Checkpoint**: reproduced 1 real connection failure by
> misconfiguring a host/port, then fixed it and confirmed success again.

## Next document

[`02-compute-page.md`](02-compute-page.md).
