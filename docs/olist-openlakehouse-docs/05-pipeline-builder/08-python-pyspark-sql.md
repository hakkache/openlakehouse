# 08 — Python, PySpark, and SQL Code Nodes

**Content type: CURRENT PLATFORM CAPABILITY (verified) + PROJECT IMPLEMENTATION.**

## The 3 code types and their trust levels

- `sql`: runs against Trino; any authenticated pipeline author can use it;
  `config.result_variable` optionally stores its first result cell.
- `python`: runs arbitrary Python with a live reference to the
  `variables` dict — **requires ADMIN or DATA_ENGINEER role**
  (`requires_elevated_role()` checks for this exact type).
- `pyspark`: same elevated-role requirement, executed via
  `spark_code_runner.run_code` (real Spark, not sandboxed).

## Hands-On Walkthrough — `sql` code node

1. Create pipeline `code_node_demo`.
2. Add a **code** node, `type = sql`,
   `code = SELECT round(avg(payment_value), 2) FROM iceberg.silver.olist_payments`
   (or `bronze` if you haven't built `silver_payments` yet),
   `result_variable = avg_payment`.
3. Run. Check the run detail page. **Expected result**: `avg_payment`
   appears in the run's final `variables` state with a real numeric
   value (roughly in the 140-160 BRL range — this is the actual average
   payment value in the dataset).

## Hands-On Walkthrough — `python` code node (requires elevated role)

4. Log in as `admin.user` (has DATA_ENGINEER/ADMIN role per
   [`16-security/03-authorization-and-rbac.md`](../16-security/03-authorization-and-rbac.md)).
5. Add a **code** node, `type = python`:
   ```python
   variables["avg_payment_doubled"] = variables["avg_payment"] * 2
   print(f"computed: {variables['avg_payment_doubled']}")
   ```
6. Run. **Expected result**: succeeds, and `avg_payment_doubled` appears
   in the run's variables at roughly double the previous step's value —
   confirms Python code nodes share the *same* `variables` dict as SQL/
   variable nodes in the same run, not an isolated sandbox.
7. **Negative test**: log out and log back in as a non-elevated user (a
   VIEWER-role account, if you have one — see
   [`16-security/03-authorization-and-rbac.md`](../16-security/03-authorization-and-rbac.md)
   for how to create one), and try to run this same pipeline.
   **Expected result**: a real 403/permission-denied error — proof the
   role check is enforced server-side, not just hidden in the UI.

## Next document

[`09-api-ingestion.md`](09-api-ingestion.md).
