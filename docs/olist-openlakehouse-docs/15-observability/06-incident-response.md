# 06 — Incident Response

**Content type: PROJECT IMPLEMENTATION.** Closes the module with a real,
practiced incident-response run using every tool built in this module.

## Hands-On Walkthrough — a full simulated incident, start to finish

1. **Trigger a real incident**: introduce the schema-drift scenario from
   [`10-data-quality/03-validity-and-schema.md`](../10-data-quality/03-validity-and-schema.md)
   (add an unexpected column to Bronze), then run a downstream Silver
   pipeline that wasn't updated for it — if your pipeline uses explicit
   column lists (per its own design), this should simply ignore the new
   column safely; if it fails, you have a real incident to respond to.
2. **Detect**: check your `Platform Health` Grafana dashboard (doc 05)
   for the resulting error signal in the Loki error panel.
3. **Diagnose**: use Loki's Explore view (doc 03) to find the full error
   stack trace/message, and Prometheus (doc 02) to confirm whether the
   failure caused any resource anomaly (e.g. a stuck query holding
   memory).
4. **Resolve**: apply the real fix from
   [`10-data-quality/03-validity-and-schema.md`](../10-data-quality/03-validity-and-schema.md)
   (drop the unexpected column, or update the pipeline to handle it).
5. **Verify resolution**: re-run the pipeline, confirm success in both
   the app's own run history and Grafana's dashboard (error panel
   returns quiet).
6. **Document** (the real practice, not just theory): write a short
   incident summary — trigger, detection method, root cause, fix,
   verification — following the same structure used by
   [`21-production-scenarios/`](../21-production-scenarios/)'s later
   incident write-ups.

> 🧪 **Checkpoint for the module**: you ran a complete detect→diagnose→
> resolve→verify cycle using your own real Grafana/Loki/Prometheus setup
> against a genuinely triggered failure, not a hypothetical one.

## Next module

[`16-security/01-security-architecture.md`](../16-security/01-security-architecture.md).
