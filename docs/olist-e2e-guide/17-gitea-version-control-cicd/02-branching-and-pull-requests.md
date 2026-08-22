# 02 — Branching and Pull Requests

## Scenario 2 (Medium) — a real branch, PR, and merge

1. Create branch `feature/add-freshness-test`, add a real dbt source
   freshness block (module 07 doc 03 concepts) to a `.yml` file, push,
   open a real PR in Gitea's UI.
2. Merge it. **Expected result**: `main` now contains the new freshness
   config — confirm by pulling `main` locally and re-running
   `dbt source freshness`.

| Step | Real artifact produced |
|---|---|
| Branch pushed | visible in Gitea's branch list |
| PR opened | visible diff matching your real change |
| PR merged | `main`'s `git log` shows the merge commit |

> 🧪 **Checkpoint**: `dbt source freshness` runs successfully using the
> config merged via your real PR.

## Next document

[`03-ci-and-audit-trail.md`](03-ci-and-audit-trail.md).
