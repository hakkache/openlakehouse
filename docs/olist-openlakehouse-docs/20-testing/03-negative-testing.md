# 03 — Negative Testing

**Content type: PROJECT IMPLEMENTATION.** Indexes every deliberate
negative test already built across this documentation set — the real
practice of proving a system fails correctly, not just succeeds.

## The complete negative-test index (all previously built, all real)

| Scenario | Document |
|---|---|
| Unsupported source/destination type raises `CompileError` | [`05-pipeline-builder/02-basic-nodes.md`](../05-pipeline-builder/02-basic-nodes.md) |
| Middle node failure skips remaining nodes | [`05-pipeline-builder/12-error-handling.md`](../05-pipeline-builder/12-error-handling.md) |
| MERGE INTO multi-event bug | [`07-dimensional-modeling/12-scd2-failure-scenarios.md`](../07-dimensional-modeling/12-scd2-failure-scenarios.md) |
| Late-arriving SCD2 change corruption | [`07-dimensional-modeling/13-scd2-late-and-out-of-order-changes.md`](../07-dimensional-modeling/13-scd2-late-and-out-of-order-changes.md) |
| Unsafe column narrowing blocked | [`08-advanced-data-engineering/03-schema-evolution-and-drift.md`](../08-advanced-data-engineering/03-schema-evolution-and-drift.md) |
| Duplicate `review_id` in real data | [`10-data-quality/02-completeness-and-uniqueness.md`](../10-data-quality/02-completeness-and-uniqueness.md) |
| Real schema drift detection | [`10-data-quality/03-validity-and-schema.md`](../10-data-quality/03-validity-and-schema.md) |
| Deleted dimension row → orphan fact | [`10-data-quality/04-referential-integrity.md`](../10-data-quality/04-referential-integrity.md) |
| Bad row blocked from destination write | [`10-data-quality/08-quality-failure-scenarios.md`](../10-data-quality/08-quality-failure-scenarios.md) |
| Tampered JWT rejected | [`16-security/05-security-scenarios.md`](../16-security/05-security-scenarios.md) |
| SQL injection resistance | [`16-security/05-security-scenarios.md`](../16-security/05-security-scenarios.md) |

## Hands-On Walkthrough — pick 3 you haven't personally re-verified yet, and run them now

1. Choose any 3 rows from the table above that you skipped or rushed
   through in earlier modules.
2. Re-execute each scenario's real steps from its source document.
3. For each, write one sentence stating the exact real error
   message/behavior you observed — if it doesn't match the document's
   claimed expected result, that's a real finding worth investigating
   (either your environment differs, or the documented claim needs
   correction).

> 🧪 **Checkpoint**: you re-verified 3 real negative-test scenarios from
> this catalog and confirmed their documented expected results hold in
> your own environment.

## Next document

[`04-full-test-matrix.md`](04-full-test-matrix.md).
