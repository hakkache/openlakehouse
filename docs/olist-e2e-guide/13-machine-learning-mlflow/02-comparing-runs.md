# 02 — Comparing Runs

## Scenario 2 (Medium) — real model comparison across runs

1. Train 3 variants (`LogisticRegression`, `RandomForestClassifier`, one
   with an added feature like `customer_state`) as 3 separate MLflow
   runs in the same experiment.
2. In the UI, use **Compare runs** to view metrics side-by-side.
   **Expected result**: a real comparison table/plot — pick a winner
   based on actual F1/AUC, not guesswork.

## Comparison table (fill in with your own real numbers)

| Run | Model | Features | Accuracy | F1 | Winner? |
|---|---|---|---|---|---|
| 1 | LogisticRegression | price, freight, month | your real value | your real value | |
| 2 | RandomForestClassifier | price, freight, month | your real value | your real value | |
| 3 | LogisticRegression | + customer_state | your real value | your real value | |

> 🧪 **Checkpoint**: 3 real runs logged and compared, with a genuine
> winner chosen from real metrics.

## Next document

[`03-model-registry.md`](03-model-registry.md).
