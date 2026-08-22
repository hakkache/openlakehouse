# 01 — Gitea and Git Workflow

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`backend/app/core/gitea_client.py`).**

## Real architecture: a thin, live proxy — no mocked data

**Verified from the module's own docstring**: every `gitea_client.py`
function performs a real HTTP call to Gitea's REST API using the
bootstrap admin account — `list_repos()`, `list_branches()`,
`is_available()` all hit the live server.

## Hands-On Walkthrough — version-control your dbt project in real Gitea

1. Open Gitea directly: `http://localhost:3002` (or your compose-mapped
   port), log in with the admin account.
2. Create a real repository, `olist-dbt-project`.
3. From a terminal, push the real `infra/dbt/dbt_project/` directory
   (built up across module 06) into it:
   ```powershell
   cd infra/dbt/dbt_project
   git init
   git remote add origin http://localhost:3002/<admin-user>/olist-dbt-project.git
   git add . ; git commit -m "Initial dbt project"
   git push -u origin main
   ```
4. Confirm in the app: open the OpenLakehouse app's own repos view (if
   present) or call `GET /v1/gitea/repos` directly. **Expected result**:
   `olist-dbt-project` appears in the real proxied list — confirms the
   backend's `list_repos()` genuinely reflects live Gitea state.
5. Make a real change (add a new marts model from module 06's exercises),
   commit, push to a new branch `feature/new-mart`, open a real Pull
   Request in Gitea's UI comparing it to `main`.

> 🧪 **Checkpoint**: you pushed a real dbt project to Gitea, confirmed it
> appears via the backend's live proxy endpoint, and opened a real PR.

## Next document

[`02-ci-cd-and-release-management.md`](02-ci-cd-and-release-management.md).
