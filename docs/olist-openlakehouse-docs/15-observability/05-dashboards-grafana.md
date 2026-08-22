# 05 — Dashboards with Grafana

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`infra/grafana/provisioning/`).**

## Hands-On Walkthrough — build a real unified platform-health dashboard

1. Open Grafana, confirm the pre-provisioned datasources/dashboards under
   `infra/grafana/provisioning/` are visible in **Dashboards**.
2. Create a new dashboard, `Platform Health`, and add:
   - A Prometheus panel: `up{}` — a real 1/0 per scrape target,
     visualized as a **Stat** panel per service (green = `1`/up).
   - A Prometheus panel: `rate(http_requests_total[5m])` (backend
     request rate).
   - A Loki panel: `{container=~"openlakehouse-.*"} |= "ERROR"` — a
     real live log stream of any error-level line across every
     OpenLakehouse container.
3. Save the dashboard.
4. **Verify it's genuinely live**: trigger a deliberate failure (e.g.
   the invalid-`pipeline_id` scenario from module 09 doc 04) and watch
   the Loki error panel update within the dashboard's own refresh
   interval — **expected result**: the new error line appears without
   manually refreshing the browser (Grafana's live-tail/auto-refresh).

> 🧪 **Checkpoint**: your `Platform Health` dashboard shows a real error
> line appearing live, moments after you deliberately triggered a
> failure elsewhere in the platform.

## Next document

[`06-incident-response.md`](06-incident-response.md).
