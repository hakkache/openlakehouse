# 03 — Governance and RBAC

## Scenario 3 (Complex) — governance via roles, tied back to lineage

1. Log in as a `VIEWER` user, open **Lineage**. **Expected result**: the
   graph is visible (read-only governance is real) but pipeline edit
   actions are blocked/absent.
2. Attempt (as `VIEWER`) a direct pipeline-edit API call (e.g. via the
   app's network tab, replaying a save request). **Expected result**: a
   real `403`.

## Read vs. write access, by role

| Role | Can view Lineage graph? | Can edit the pipelines that produce it? |
|---|---|---|
| `VIEWER` | Yes | No (403) |
| `DATA_ANALYST` | Yes | Only non-elevated pipelines |
| `DATA_ENGINEER` | Yes | Yes |
| `ADMIN` | Yes | Yes |

> 🧪 **Checkpoint**: confirmed a `VIEWER` can see the full lineage graph
> but receives a real `403` on a direct pipeline-edit API replay.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../12-bi-analytics-superset/00-index.md`](../12-bi-analytics-superset/00-index.md).
