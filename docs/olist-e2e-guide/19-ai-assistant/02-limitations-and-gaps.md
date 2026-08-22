# 02 — Limitations and the Real No-Schema-Awareness Gap

## Scenario 2 (Medium) — prove the no-RAG/no-schema-awareness gap live

1. Ask the assistant a question that requires knowing your **actual**
   real column names, e.g. "what's the average freight_value in
   olist_order_items for late orders?" **Expected result**: it cannot
   genuinely know your real column names/table contents (no RAG
   pipeline queries your metadata store) — it will either hedge,
   hallucinate plausible-sounding column names, or ask you to supply the
   schema yourself. Confirm whichever happens, and compare its guessed
   column names against the real ones from module 03's ERD.

## Capability boundary, proven

| Question type | Real outcome |
|---|---|
| Generic SQL/concept question | Genuinely helpful |
| Question requiring live knowledge of YOUR actual schema/data | Cannot know it — no RAG; may hallucinate |

> 🧪 **Checkpoint**: asked 1 schema-specific question, and compared its
> answer's assumed column/table names against the real ERD from module
> 03 doc 01 — documented any mismatch found.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../20-production-incidents-and-capstone/00-index.md`](../20-production-incidents-and-capstone/00-index.md).
