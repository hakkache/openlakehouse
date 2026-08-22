# 01 — Repo and First Push

## Scenario 1 (Simple) — create a repo and push real dbt project code

1. Open Gitea (`http://localhost:3002` or your configured port), create
   a real repository, e.g. `olist-dbt-models`.
2. Push your real `infra/dbt/dbt_project/` (or a copy) to it via
   standard `git remote add`/`git push`. **Expected result**: real
   commit history visible in Gitea's own UI, matching your local `git
   log`.

> 🧪 **Checkpoint**: `git log` locally matches the commit list shown in
> Gitea's UI exactly.

## Next document

[`02-branching-and-pull-requests.md`](02-branching-and-pull-requests.md).
