# 13 — Error Handling and Fail-Fast, In Detail

**Content type: CURRENT PLATFORM CAPABILITY, verified from
`_run_node_sequence` and the run-loop in `pipeline_executor.py`.**

## The real fail-fast contract

```mermaid
flowchart LR
    N1[Node 1: SUCCESS] --> N2[Node 2: FAILED]
    N2 -.stops execution.-> N3[Node 3: SKIPPED]
    N3 -.-> N4[Node 4: SKIPPED]
```

The moment any node's execution raises (a `CompileError`,
`ExecutionError`, or any uncaught exception from a `code:python`/
`pyspark` node, a real Trino error from a `code:sql` node, a real HTTP
error from `api_ingestion`, etc.), the executor:

1. Records that node's `NodeRunStatus` as `FAILED` with the real
   exception message.
2. Marks **every remaining node** in topological order as `SKIPPED` —
   they are never attempted, not even independent branches unrelated to
   the failure.
3. Marks the overall `PipelineRunStatus.status` as `FAILED` with the
   triggering error surfaced at the top level too.

This is a deliberate all-or-nothing design for `mode: advanced` runs —
there is no "continue on error" or per-branch isolation today.

## Scenario 1 (Simple) — a linear 4-node failure

1. Pipeline `fail_fast_linear`: `variable(literal, x=1)` →
   `code:sql(query="SELECT 1/0")` → `code:sql(query="SELECT 1")` →
   `destination(...)`. Run.
2. **Expected result**: node 1 `SUCCESS`, node 2 `FAILED` (real
   divide-by-zero error from Trino), nodes 3 and 4 `SKIPPED`.

## Scenario 2 (Medium) — failure inside a branch that looks independent

3. Pipeline `fail_fast_branches`: two **parallel** source→transform
   chains (no edge between them) both feeding a final `union` node. Break
   one branch (e.g. reference a nonexistent column in its `select`).
   Run. **Expected result**: even though the *other* branch has no
   dependency on the broken one, it may still show `SKIPPED` if the
   executor's topological order reaches the broken node first — confirm
   your own observed ordering (topological sort order for independent
   branches is not guaranteed to match your visual left-to-right layout)
   and note this as a real, non-obvious behavior worth designing around.

## Scenario 3 (Medium→Complex) — failure inside a `for_each` loop body

4. Reuse module 08's `per_status_counts` loop, but make the 3rd iteration
   deliberately fail (e.g. template a status value that produces invalid
   SQL on that specific iteration). **Expected result**: per
   `_run_for_each`'s real implementation, `any_failed` is set and the
   loop **breaks immediately** — iterations after the failing one (e.g.
   the 4th status) never run, but iterations before it (1st, 2nd) show
   real `SUCCESS` — confirm this exact partial-completion pattern in the
   run detail's `iteration_index` values.

## Scenario 4 (Complex) — failure inside a sub-pipeline propagates up

5. Make module 11's `qc_not_null_check` child pipeline fail (e.g.
   reference a nonexistent table). Call it from a parent pipeline that
   has additional nodes after the `sub_pipeline` node. **Expected
   result**: the parent's `sub_pipeline` node itself shows `FAILED`
   (`"Sub-pipeline '<name>' FAILED"`), and everything after it in the
   parent is `SKIPPED` — a child failure is not swallowed or treated as a
   soft warning.

## Scenario 5 (Complex) — the one real "soft" failure: quality nodes

6. Recall from module 06: quality nodes report a `violations`/`actual`
   count but **do not themselves halt the pipeline** — only a downstream
   `control:if` wired to check that count can turn it into a real halt.
   **Prove this explicitly**: build a pipeline with a `range` quality node
   showing real violations, followed directly by a `destination` node
   with **no** `if` gate in between. **Expected result**: the destination
   node still runs and writes real (bad) data — quality nodes are
   observability, not enforcement, unless you wire the gate yourself.
   Compare this directly against module 10's "quality gate that actually
   blocks a bad write" scenario from the main guide.

> 🧪 **Checkpoint**: reproduced fail-fast on a simple linear pipeline, on
> independent parallel branches, inside a `for_each` loop (confirming
> partial-iteration completion), and through a sub-pipeline boundary —
> and explicitly demonstrated that quality nodes alone do **not** block a
> write without an added `if` gate.

## Next document

[`14-simple-vs-advanced-node-comparison.md`](14-simple-vs-advanced-node-comparison.md).
