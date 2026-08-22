# Troubleshooting

**Content type: REFERENCE.** Real, previously-encountered issues and
their real fixes, indexed for quick lookup.

| Symptom | Real cause | Fix |
|---|---|---|
| Docker image pull fails "not found" | Guessed/nonexistent tag | Verify the exact published tag on Docker Hub before using it |
| Healthcheck stuck "starting" forever | Image lacks `curl` | Use a Python-based healthcheck (`urllib.request`) instead |
| New compose bind-mount/command not applied | Container wasn't recreated | `docker compose up -d --force-recreate <service>` |
| MERGE INTO produces duplicate/resurrected rows | Multiple events per key in one batch, no dedupe | `ROW_NUMBER() OVER (PARTITION BY key ORDER BY recency DESC)` before MERGE |
| `spark-submit --packages` missing a package | CLI flag replaces, doesn't merge with, `spark-defaults.conf` | Pass ALL needed coordinates in one `--packages` flag |
| Iceberg `.append()` fails, "table not found" | Table never created | `CREATE TABLE IF NOT EXISTS ... USING iceberg` first, or use `.createOrReplace()` |
| Streaming job reports 0 rows processed | Stale/partial checkpoint from a failed prior run | Delete the checkpoint directory before retrying |
| `0.1 + 0.2 = 0.3` returns false in Trino | `double` type imprecision | Use `decimal(p,s)` for money columns, never `double` |
| dbt model fails "source not found" | Source YAML renamed/typo'd | Fix `_olist_sources.yml`, re-run `dbt run --select model+` |
| Pipeline shows unexpected `SKIPPED` node | An upstream node failed (fail-fast executor) | Check the failed node's real error message first, fix root cause |
| Superset can't connect to Trino | Wrong connection string / network | Use `trino://admin@trino:8080/iceberg/<schema>` on the shared docker network |
| Ollama assistant `available: false` | Model not pulled | `docker compose exec ollama ollama pull <model>` |
| API returns 403 for an elevated action | User's JWT role isn't `ADMIN`/`DATA_ENGINEER` | Confirm real role via decoded JWT, not assumption |
| Disabled Keycloak user still has API access | Existing JWT not yet expired | Wait for token expiry or implement token revocation |

## Next reference document

[`glossary.md`](glossary.md).
