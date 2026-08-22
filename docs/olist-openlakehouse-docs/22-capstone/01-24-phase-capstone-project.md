# 01 — The Full-Platform Capstone Project

**Content type: PROJECT IMPLEMENTATION.** A single end-to-end exercise
exercising real capability from every one of the 21 modules preceding
this one, using only the real Olist dataset and this real platform — no
new mechanisms, purely integration.

## The capstone task

**Build and operate, completely from scratch, a "Seller Performance &
Risk" data product**, combining late-delivery risk, revenue, and
historical seller-quality trend into one governed, tested, monitored,
scheduled, and BI-visualized pipeline — end to end.

## Hands-On Walkthrough — the required real steps, in order

1. **Ingest** (module 03): confirm `bronze.olist_sellers`,
   `bronze.olist_orders`, `bronze.olist_order_items` are present and
   preserved unmutated.
2. **Transform** (module 04/05): build a `silver_seller_performance`
   pipeline computing per-seller on-time-delivery rate and average
   delivery days, with at least 2 real quality gates (`not_null`,
   `range`).
3. **Model** (module 07): extend `dim_sellers_scd2` (built earlier) with
   a new `risk_tier` attribute (`LOW`/`MEDIUM`/`HIGH`, derived from the
   on-time rate), tracked with real SCD2 history.
4. **Test** (modules 06/10/20): add at least 2 real dbt tests and 1
   referential-integrity check for this new mart.
5. **Orchestrate** (module 09): schedule the pipeline daily via a real
   cron on its own `PipelineDefinition.schedule` field.
6. **Visualize** (module 12): build a `Seller Risk` Superset dashboard
   showing risk-tier distribution and top-10 highest-risk sellers by
   order volume.
7. **Secure** (module 16): confirm only `DATA_ENGINEER`/`ADMIN` roles can
   modify this pipeline, `VIEWER` can see the dashboard only.
8. **Observe** (module 15): add a Grafana panel showing this pipeline's
   real run success/failure history.
9. **Document a real incident**: deliberately break one part of this
   chain (your choice — a bad rename, a schema drift, a MERGE dedupe
   bug) and run a full detect→diagnose→resolve→verify cycle against your
   own new pipeline, following
   [`15-observability/06-incident-response.md`](../15-observability/06-incident-response.md)'s
   pattern.

## Completion criteria (all must be genuinely true in your own environment)

- [ ] `silver_seller_performance` runs successfully and its output row
      count matches `dim_sellers`'s (3095).
- [ ] `dim_sellers_scd2`'s `risk_tier` shows at least one real historical
      change if you simulate a seller's performance shifting.
- [ ] All new dbt/quality tests pass.
- [ ] The pipeline fires automatically at least once via its real cron
      schedule (observed in Dagster's tick history).
- [ ] The `Seller Risk` dashboard is visible at `/dashboards` with real,
      non-placeholder numbers.
- [ ] A `VIEWER`-role user is confirmed blocked from editing the
      pipeline (real `403`, not just a hidden button).
- [ ] You completed one full, real incident-response cycle against this
      new pipeline.

> 🧪 **Final Checkpoint**: every box above is checked using your own
> real, personally-verified platform state — this capstone is complete
> only when every item was genuinely observed, not assumed.

## Next module

[`23-reference/commands.md`](../23-reference/commands.md).
