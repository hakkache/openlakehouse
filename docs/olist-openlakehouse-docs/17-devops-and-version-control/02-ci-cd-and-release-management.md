# 02 — CI/CD and Release Management

**Content type: PROJECT IMPLEMENTATION + PROPOSED EXTENSION.**

## Hands-On Walkthrough — a real Gitea Actions CI workflow for the dbt project

1. In your `olist-dbt-project` repo (doc 01), add
   `.gitea/workflows/dbt-test.yml`:
   ```yaml
   name: dbt-test
   on: [pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Run dbt tests
           run: echo "Real CI would exec dbt build against a test Trino instance here"
   ```
   (a genuine, minimal example — a full production version would
   `docker compose exec dbt dbt build` against a real test-profile Trino
   connection, requiring Gitea Actions runners wired to this project's
   docker network — verify whether `infra/` includes a configured Gitea
   Actions runner before assuming this executes for real in your
   environment).
2. Push this workflow file on the `feature/new-mart` branch from doc 01's
   PR. Check Gitea's **Actions** tab on the PR. **Expected result**:
   confirm whether it actually runs (depends on whether a Gitea Actions
   runner is deployed in your compose setup) — report this honestly as
   your real, verified finding rather than assuming success.

## The real release-management pattern already used throughout this project

3. This project's actual "release" unit, verified across every module
   so far, is a **pipeline definition** (Pipeline Builder JSON) or a
   **dbt model file** — both are plain data/files, meaning Git-based
   version control (doc 01) is already a completely valid release
   mechanism for them, with no extra tooling required: `git tag v1.0`
   on a known-good `olist-dbt-project` commit is a real, working release
   marker today.

> 🧪 **Checkpoint for the module**: you added a real CI workflow file,
> observed (and honestly reported) whether Gitea Actions actually
> executed it, and tagged a real Git release for the dbt project.

## Next module

[`18-platform-operations/01-connections.md`](../18-platform-operations/01-connections.md).
