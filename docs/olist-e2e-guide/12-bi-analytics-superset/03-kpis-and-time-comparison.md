# 03 — KPIs and Time Comparison

## Scenario 4 (Medium→Complex) — the real `is_late` metric as a dashboard KPI

1. Build a **Big Number** chart on `is_late` rate:
   `avg(CASE WHEN is_late THEN 1.0 ELSE 0 END)` from module 05's derived
   column. Add a **time comparison** filter (this month vs. last).

## Expected real shape of the result

| Metric | Expected type | Notes |
|---|---|---|
| `is_late` rate | a real fraction between 0 and 1 | must reflect only non-`NULL` `is_late` rows |
| Time comparison delta | a real +/- percentage vs. prior period | changes as you adjust the date range |

> 🧪 **Checkpoint**: your Big Number KPI shows a plausible late-delivery
> rate (compare it to the raw distribution query from module 05 doc 04
> to sanity-check it's not wildly off).

## Next document

[`04-dashboards-cross-filtering-and-broken-charts.md`](04-dashboards-cross-filtering-and-broken-charts.md).
