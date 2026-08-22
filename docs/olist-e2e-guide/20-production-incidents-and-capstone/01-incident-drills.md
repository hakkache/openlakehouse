# 01 — Three Realistic Incident Drills

## Incident 1 (Complex) — "Gold numbers look wrong" (traces back to the MERGE bug)

1. Deliberately reintroduce module 08 doc 05's MERGE bug (skip the
   `ROW_NUMBER()` dedup) on a real CDC batch (module 14 doc 04). Notice
   the discrepancy via a Superset dashboard (module 12) showing an
   implausible spike. Trace: dashboard → underlying mart → fact table →
   MERGE statement → root cause. Fix and confirm the dashboard corrects.

## Incident 2 (Complex) — "Scheduled pipeline silently stopped running"

2. Deliberately break a pipeline's cron (`schedule` cleared), wait past
   its expected fire time. Detect it via Grafana/absence of expected
   Loki log lines (module 15), confirm root cause via Dagster's sensor
   tick history (module 09 doc 02), fix by restoring the schedule.

## Incident 3 (Complex) — "Unauthorized access attempt"

3. Reproduce a real 403 (module 16 doc 01) from a misconfigured role,
   confirm it's captured in the audit log, and correct the role
   assignment in Keycloak.

## Incident summary table

| Incident | Detected via | Root cause | Fixed via |
|---|---|---|---|
| Gold numbers wrong | Superset dashboard | MERGE multi-event bug | `ROW_NUMBER()` dedup |
| Pipeline silently stopped | Grafana/Loki absence + Dagster tick history | cleared cron schedule | restore schedule |
| Unauthorized access | Audit log + real 403 | misconfigured role | correct Keycloak role |

> 🧪 **Checkpoint**: completed all 3 incident drills, each traced from a
> real symptom back to a real root cause using tools from at least 2
> different prior modules.

## Next document

[`02-capstone-run.md`](02-capstone-run.md).
