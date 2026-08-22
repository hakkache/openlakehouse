# 02 — Source and Destination Nodes

**Content type: CURRENT PLATFORM CAPABILITY, verified from
`_compile_source`/`_compile_destination_target` in `pipeline_compiler.py`.**

## Source: 1 real type, 8 UI-only

The palette offers `iceberg_table, csv, json, parquet, rest_api,
postgresql, mysql, sqlserver, kafka` (the full `SOURCE_TYPES` set from
`schemas/pipeline.py`, matching the platform's specification), but the
compiler implements exactly one:

```python
# _compile_source
if node.type != "iceberg_table":
    raise CompileError(f"Source type '{node.type}' is not yet supported by the compiler")
schema = node.config["schema"]
table = node.config["table"]
# -> SELECT * FROM iceberg.{schema}.{table}
```

| Config key | Required | Example |
|---|---|---|
| `schema` | yes | `"bronze"`, `"silver"`, `"gold"` |
| `table` | yes | `"olist_orders"` |

## Destination: 3 real types, 2 UI-only

`_DESTINATION_SCHEMA` maps only `iceberg_bronze → bronze`,
`iceberg_silver → silver`, `iceberg_gold → gold`. `minio` and `kafka` are
palette-visible, spec'd, but not compiled.

| Config key | Required | Example |
|---|---|---|
| `table` | yes | `"olist_sellers_simple"` |

## Hands-On Walkthrough — Scenario 1 (Simple): the smallest possible real pipeline

1. New pipeline `smallest_real_pipeline`. Add exactly 2 nodes, connected
   by 1 edge:
   - `source`, `type=iceberg_table`, `config={"schema":"bronze","table":"olist_sellers"}`
   - `destination`, `type=iceberg_silver`, `config={"table":"olist_sellers_copy"}`
2. **Compile**. **Expected result**: `mode: "sql"`,
   `full_sql = "CREATE OR REPLACE TABLE iceberg.silver.olist_sellers_copy AS SELECT * FROM iceberg.bronze.olist_sellers"`
   (or your platform's equivalent INSERT/CTAS wording — inspect the exact
   string yourself).
3. **Run**. Verify: `SELECT count(*) FROM iceberg.silver.olist_sellers_copy;`
   **Expected**: `3095` — an exact 1:1 copy.

## Scenario 2 (Negative test) — prove unsupported types fail loudly, not silently

4. On a new pipeline, add a `source` node with `type=csv` (pick it from
   the palette on purpose) and leave `config` empty. **Compile**.
   **Expected result**: a real compile error —
   `"Source type 'csv' is not yet supported by the compiler"` — this is
   the platform's deliberate "fail loud, not silent" design: unsupported
   spec'd types never produce empty/wrong data, they simply refuse to
   compile.
5. Repeat with a `destination` node, `type=minio`. **Expected**:
   `"Destination type 'minio' is not yet supported by the compiler"`.

## Scenario 3 (Medium) — missing required config, a different failure mode

6. Add a valid `source` node, `type=iceberg_table`, but omit `table` from
   `config` (keep only `schema`). **Compile**. **Expected result**: a
   distinct error — `"Source node <id> requires config.schema and
   config.table"` — proving the compiler validates required keys
   separately from type support.

## Why this design choice makes sense

Showing the full specified palette (even non-compiled types) lets you
see the platform's intended end-state design without hiding it — but
every gap is a hard compile-time error, never a silently wrong or empty
result. This is the same "verify, don't assume" principle this whole
guide is built around.

> 🧪 **Checkpoint**: built and ran the smallest possible real pipeline
> (1 source → 1 destination), and triggered 3 distinct real error
> messages (unsupported source type, unsupported destination type,
> missing required config).

## Next document

[`03-transformations-part1-select-rename-filter-join-union.md`](03-transformations-part1-select-rename-filter-join-union.md).
