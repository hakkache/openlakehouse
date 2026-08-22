# SQL Reference

**Content type: REFERENCE.** The most-reused real SQL patterns from this
documentation set, in one place.

## Iceberg metadata tables

```sql
SELECT * FROM iceberg.<schema>."<table>$files";
SELECT * FROM iceberg.<schema>."<table>$snapshots";
SELECT * FROM iceberg.<schema>."<table>$partitions";
SELECT * FROM iceberg.<schema>."<table>$history";
```

## Completeness / uniqueness audit (module 10 pattern)

```sql
SELECT count(*) AS n, count(DISTINCT <pk_col>) AS d, count(*) - count(<pk_col>) AS nulls
FROM iceberg.<schema>.<table>;
```

## Referential integrity / orphan check (module 10 pattern)

```sql
SELECT count(*) AS orphans
FROM iceberg.gold.<fact> f
LEFT JOIN iceberg.gold.<dim> d ON f.<fk> = d.<pk>
WHERE d.<pk> IS NULL;
```

## MERGE with mandatory dedupe (module 07/08/14 pattern — never skip this)

```sql
MERGE INTO target t
USING (
  SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY key_col ORDER BY offset_col DESC) AS rn
    FROM source_batch
  ) WHERE rn = 1
) s
ON t.key_col = s.key_col
WHEN MATCHED THEN UPDATE SET t.col = s.col
WHEN NOT MATCHED THEN INSERT (key_col, col) VALUES (s.key_col, s.col);
```

## SCD2 temporal join (module 07 pattern)

```sql
SELECT f.*, d.attribute
FROM fact f
JOIN dim_scd2 d ON f.dim_key = d.dim_key
  AND f.event_date >= d.valid_from AND f.event_date < d.valid_to;
```

## Compaction

```sql
ALTER TABLE iceberg.<schema>.<table> EXECUTE optimize;
```

## Next reference document

[`troubleshooting.md`](troubleshooting.md).
