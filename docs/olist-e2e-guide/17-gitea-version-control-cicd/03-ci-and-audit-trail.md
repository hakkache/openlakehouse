# 03 — CI and the Audit Trail

## Scenario 3 (Medium→Complex) — tie a Gitea action back to the app's audit log

Recall the platform's real audit logging (`backend/app/core/audit.py`).

1. Perform a real Gitea action through the app's own proxy (not
   Gitea's raw UI) — e.g. trigger a repo action via the app's API if
   exposed, or push through app-mediated credentials.
2. Check the app's own **Audit Log** page. **Expected result**: a real
   entry correlating your Gitea action's timestamp with an audit record,
   proving Gitea actions taken through the app are genuinely tracked,
   not just logged by Gitea alone.

## The real scope: thin proxy, not a full reimplementation

| What the app provides | What it does NOT provide |
|---|---|
| A thin REST proxy to Gitea (`gitea_client.py`) | A full Gitea UI reimplementation inside the app |
| Audit-log correlation for app-mediated actions | Audit logging for actions taken directly in Gitea's own UI |

> 🧪 **Checkpoint**: found 1 real audit-log entry correlating to an
> app-mediated Gitea action, and can state in one sentence why a raw
> Gitea-UI action would NOT show up there.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../18-platform-operations-workspace-compute/00-index.md`](../18-platform-operations-workspace-compute/00-index.md).
