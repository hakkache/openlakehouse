# 04 — SCD Type 1 vs Type 2, Built and Compared Directly

## Scenario 4 (Complex) — SCD Type 1 vs Type 2

1. **Type 1** (`dim_sellers`): change a real seller's city, rebuild,
   confirm the old value is simply gone (correct behavior for typo
   fixes, wrong for real historical change).
2. **Type 2** (`dim_sellers_scd2`): build with `valid_from`/`valid_to`/
   `is_current`, using a real 2-step MERGE (expire old + insert new).
   Change a seller's city, re-run, confirm **exactly 2** historical rows
   result.

## Direct comparison table (same real change, two different outcomes)

| Design | Rows after 1 city change | Can you answer "what was the city on 2017-05-01"? |
|---|---|---|
| SCD1 (`dim_sellers`) | 1 (overwritten) | No — history is gone |
| SCD2 (`dim_sellers_scd2`) | 2 (both preserved) | Yes — via `valid_from`/`valid_to` |

## When to use which, in this real project

| Use SCD1 when... | Use SCD2 when... |
|---|---|
| The change is a correction (typo, data-entry fix) | The change is a real business event you must be able to report on historically |
| You never need "as of date X" reporting on this attribute | Any dashboard/report needs point-in-time accuracy (e.g. "which region was this seller in when the order was placed") |

> 🧪 **Checkpoint**: the exact same real seller-city change produces 1
> row in your SCD1 table and 2 rows in your SCD2 table — verified
> directly, not just described.

## Next document

[`05-the-merge-multi-event-bug.md`](05-the-merge-multi-event-bug.md).
