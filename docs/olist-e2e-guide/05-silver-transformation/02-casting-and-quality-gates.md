# 02 — Casting and Quality Gates

## Scenario 2 (Simple→Medium) — add type casting and quality gates

1. Add a **cast** node: cast money-like columns to `decimal(10,2)` (never
   `double`). **Prove why**: run `SELECT 0.1 + 0.2 = 0.3;` in Trino.
   **Expected result**: `false` — a real binary floating-point trap
   that would silently corrupt any money aggregation done in `double`.
2. Add a **not_null** quality node on `order_id`, a **unique** quality
   node on `order_id`. Re-run.

| Node | Type | Config | Expected result |
|---|---|---|---|
| 5 | `quality` / `not_null` | `columns=[order_id]` | `violations = 0` |
| 6 | `quality` / `unique` | `columns=[order_id]` | `violations = 0` |

3. **Negative test**: temporarily point the `unique` node at
   `order_status` instead (a genuinely non-unique column). **Expected
   result**: a real non-zero `violations` count — confirms this node is
   a live check against real data, not a fixed pass. Revert afterward.

> 🧪 **Checkpoint**: both quality gates pass against real clean data, and
> you've triggered one real, deliberate violation to prove they're not
> hardcoded to always pass.

## Next document

[`03-deduplicating-reviews.md`](03-deduplicating-reviews.md).
