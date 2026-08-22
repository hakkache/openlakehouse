# OpenLakehouse — Pipeline Builder + dbt, Hands-On Guide (Olist dataset)

This is a **practice-only** guide. No theory chapters — every section is a scenario
you build with your own hands, in your own browser, using the real Olist dataset.
Scenarios get progressively harder: Scenario 1 is "click 3 buttons and press Run",
Scenario 20 is a full mixed pipeline combining basic transforms, quality gates,
variables, loops, branches, and a dbt build step in one graph.

**19 pipeline scenarios total** (1-8 basic → intermediate → advanced, 9-18 cover
every remaining transform/quality type plus every advanced node kind on its own,
19 is a final capstone that mixes a basic chain + quality gates + variables +
a conditional branch + a dbt node in one graph), **+ a full dbt chapter**
(staging/intermediate/marts, schema tests, macros, snapshots/SCD2, tags,
full-refresh). Every node type in the palette is used at least once somewhere in
this guide.

You will use two screens throughout:
- **No-Code Pipeline Builder**: `http://localhost/pipelines`
- **dbt page**: `http://localhost/dbt`
- (to check results) **SQL Editor**: `http://localhost/sql`

Log in with `engineer.user` / `openlakehouse` (or `admin.user` / `openlakehouse`).

---

## 0. Before you start — what must already exist

This guide assumes you already loaded the 8 main Olist CSVs into **bronze** Iceberg
tables via Jupyter/PySpark (the ingestion chapter you did earlier). You need these
tables to exist and be queryable as `iceberg.bronze.<name>`:

| Bronze table | Real columns you'll use in this guide |
|---|---|
| `olist_customers` | `customer_id`, `customer_unique_id`, `customer_zip_code_prefix`, `customer_city`, `customer_state` |
| `olist_orders` | `order_id`, `customer_id`, `order_status`, `order_purchase_timestamp`, `order_approved_at`, `order_delivered_carrier_date`, `order_delivered_customer_date`, `order_estimated_delivery_date` |
| `olist_order_items` | `order_id`, `order_item_id`, `product_id`, `seller_id`, `shipping_limit_date`, `price`, `freight_value` |
| `olist_order_payments` | `order_id`, `payment_sequential`, `payment_type`, `payment_installments`, `payment_value` |
| `olist_order_reviews` | `review_id`, `order_id`, `review_score`, `review_comment_title`, `review_comment_message`, `review_creation_date`, `review_answer_timestamp` |
| `olist_products` | `product_id`, `product_category_name`, `product_name_lenght`, `product_photos_qty`, `product_weight_g` |
| `olist_sellers` | `seller_id`, `seller_zip_code_prefix`, `seller_city`, `seller_state` |
| `olist_category_translation` (or whatever you named it) | `product_category_name`, `product_category_name_english` |

Quick check — open the SQL Editor (`/sql`) and run:

```sql
SELECT table_name FROM iceberg.information_schema.tables WHERE table_schema = 'bronze';
```

If any `olist_*` table is missing, go back to your ingestion notebook and load it
first (use `pandas.read_csv()` + `spark.createDataFrame()`, not `spark.read.csv()`
on the Jupyter-uploaded path — see the ingestion chapter for why).

**Naming convention used in this guide:** every table this guide creates is prefixed
so you can find (and delete) everything afterward with `LIKE 'pb_%'`.

---

## 1. A 2-minute tour of the Pipeline Builder

Open `http://localhost/pipelines`. You'll see 3 areas:

1. **Left sidebar** — a list of your saved pipelines (top), a "New" / "Duplicate" /
   "Delete" row, a **node search box**, and the **node palette** below it, grouped by
   kind (`source`, `transform`, `quality`, `destination`, `variable`, `code`,
   `control`, `api_ingestion`, `sub_pipeline`, `dbt`). Click a node-type button to
   drop it on the canvas (or drag it).
2. **Center canvas** — your pipeline graph (React Flow). Drag from the little dot on
   a node's right edge to another node's left edge to connect them.
3. **Right panel** — appears when you click a node. Shows its real config fields
   (dropdowns / text boxes / key-value rows — not raw JSON), a **"Copy ID"** button,
   and a delete button.

At the top of the page: a **pipeline name box** (rename `untitled_pipeline` before
you save), and 3 buttons: **Compile** (SQL preview, dry-run, only works for pipelines
made only of source/transform/quality/destination nodes), **Save**, **Run**
(Run auto-saves first, but you need to click Save at least once to create the
pipeline — Run requires a saved pipeline id).

**Golden rule for every scenario below:** build the nodes → connect the edges →
**Save** → **Compile** (if available, to sanity-check the SQL) → **Run** → wait for
the green checkmarks → verify the result table in the SQL Editor.

---

## 2. Scenario 1 (Beginner) — "Hello Pipeline": copy a bronze table into silver

Goal: learn the click-flow with the simplest possible pipeline — no transforms at all.

1. Rename the pipeline (top-left box) to `pb_scenario1_hello`.
2. In the palette, open the **source** group → click **iceberg_table**. A blue node
   appears on the canvas.
3. Click the new node. In the right panel:
   - **Schema** dropdown → `bronze`
   - **Table** dropdown → `olist_sellers`
4. In the palette, open **destination** → click **iceberg_silver**. A violet node
   appears.
5. Click it. In the right panel:
   - **Table name** → type `pb_sellers_raw`
6. Connect the two nodes: drag from the source node's right-hand dot to the
   destination node's left-hand dot.
7. Click **Compile**. You should see a SQL preview like:
   ```sql
   CREATE TABLE IF NOT EXISTS iceberg.silver.pb_sellers_raw AS
   WITH n_source_... AS (SELECT * FROM iceberg.bronze.olist_sellers)
   SELECT * FROM n_source_...
   ```
8. Click **Save**, then **Run**. Wait until both nodes turn green.
9. Verify in the SQL Editor:
   ```sql
   SELECT COUNT(*) FROM iceberg.silver.pb_sellers_raw;   -- expect 3095
   ```

**Gotcha to learn now:** destination nodes compile to `CREATE TABLE IF NOT EXISTS`.
If you click **Run** again, nothing changes (it's a no-op — the table already
exists). If you want to force a rebuild, run `DROP TABLE iceberg.silver.pb_sellers_raw;`
in the SQL Editor first, then Run the pipeline again.

---

## 3. Scenario 2 (Beginner) — clean the customers table

Goal: `select` → `rename` → `cast` → 2 quality gates → `destination`.

New pipeline: `pb_scenario2_customers_clean`.

1. **source** / `iceberg_table` → schema `bronze`, table `olist_customers`.
2. **transform** / `select` → connect it to the source. Config field **"Columns to
   keep"**, type exactly:
   ```
   customer_id, customer_unique_id, customer_zip_code_prefix, customer_city, customer_state
   ```
3. **transform** / `cast` → connect it to the `select` node. Config:
   - **"Casts (column → type)"** → add row: key `customer_zip_code_prefix`, value
     `VARCHAR`
   - **"Other columns to keep as-is"** → type:
     ```
     customer_id, customer_unique_id, customer_city, customer_state
     ```
4. **quality** / `not_null` → connect it to `cast`. **"Columns that must not be
   null"** → type:
   ```
   customer_id, customer_unique_id
   ```
5. **quality** / `unique` → connect it to the `not_null` node (quality nodes pass
   data straight through, so you can chain several). **"Columns that must be unique
   together"** → type:
   ```
   customer_id
   ```
6. **destination** / `iceberg_silver` → connect it to the `unique` node. **"Table
   name"** → `pb_customers_clean`.
7. Save → Compile (read the SQL — notice the quality checks are separate `SELECT
   COUNT(*) AS violations ...` queries, not part of the main CTE chain) → Run.
8. Verify:
   ```sql
   SELECT COUNT(*) FROM iceberg.silver.pb_customers_clean;         -- expect 99441
   SELECT customer_zip_code_prefix FROM iceberg.silver.pb_customers_clean LIMIT 3;
   ```

**Why it will pass:** `customer_id` is unique per row in the raw file (it's really
one row per *order*, not per person — `customer_unique_id` is the real per-person
key and legitimately repeats). If you swap the `unique` check to
`customer_unique_id`, it will **fail** (many customers ordered more than once) —
try it, watch the node turn red, and see that the destination node never runs
(quality gates really block downstream writes, they don't just report and continue).

---

## 4. Scenario 3 (Beginner+) — clean the orders table with real quality gates

New pipeline: `pb_scenario3_orders_clean`.

1. **source** / `iceberg_table` → `bronze` / `olist_orders`.
2. **transform** / `cast` → connect to source.
   - **Casts**: `order_purchase_timestamp` → `TIMESTAMP`, `order_approved_at` →
     `TIMESTAMP`, `order_delivered_customer_date` → `TIMESTAMP`,
     `order_estimated_delivery_date` → `TIMESTAMP`
   - **Keep**: `order_id, customer_id, order_status, order_delivered_carrier_date`

   > Lucky fact: Olist's timestamps are already formatted `YYYY-MM-DD HH:MM:SS`, so
   > plain `CAST(x AS TIMESTAMP)` works — you do **not** need
   > `from_iso8601_timestamp()` like you would for ISO-8601 `T`/`Z` timestamps.

3. **quality** / `not_null` → connect to `cast`. Columns:
   ```
   order_id, customer_id, order_status
   ```
4. **quality** / `unique` → connect to the `not_null` node. Columns: `order_id`.
5. **destination** / `iceberg_silver` → connect to `unique`. Table name:
   `pb_orders_clean`.
6. Save → Run → verify:
   ```sql
   SELECT COUNT(*) FROM iceberg.silver.pb_orders_clean;  -- expect 99441
   SELECT order_status, COUNT(*) FROM iceberg.silver.pb_orders_clean GROUP BY 1 ORDER BY 2 DESC;
   ```

---

## 5. Scenario 4 (Intermediate) — join + aggregate: revenue per order

This introduces the **join** node — and the easiest way to avoid Trino's "ambiguous
column" error: **rename the join key on one side before joining**.

New pipeline: `pb_scenario4_order_revenue`.

1. **source A**: `iceberg_table` → `bronze` / `olist_order_items`.
2. **transform** / `aggregate` → connect to source A.
   - **"Group by columns"**: `order_id`
   - **"Aggregations (column → function)"**: add rows
     `price → sum`, `freight_value → sum`, `order_item_id → count`
   - This produces columns `order_id`, `price_sum`, `freight_value_sum`,
     `order_item_id_count` (aggregate output columns are always named
     `<column>_<function>`).
3. **transform** / `rename` → connect to the `aggregate` node. This avoids the
   `order_id` collision with the orders table we're about to join in.
   - **Mapping**: `order_id → item_order_id`
   - **Keep**: `price_sum, freight_value_sum, order_item_id_count`
4. **source B**: another `iceberg_table` node → `bronze` / `olist_orders`.
5. **transform** / `join` → connect **both** the `rename` node (as its main input —
   draw the edge from rename → join) **and** source B into it.
   - **"Join with"** dropdown → pick your `olist_orders` source node (shown as
     `iceberg_table (source_..._N)` in the list)
   - **"Join type"** → `inner`
   - **"ON condition"** → type: `item_order_id = order_id`

   > Why this works: since we renamed the left side's key to `item_order_id`, there
   > is now only ONE column named `order_id` in scope (from the orders side) and
   > only one named `item_order_id` (from the items side) — no ambiguity, so you
   > can reference both unqualified.
6. **transform** / `select` → connect to `join`. **"Columns to keep"**:
   ```
   order_id, customer_id, order_status, price_sum, freight_value_sum, order_item_id_count
   ```
7. **destination** / `iceberg_gold` → connect to `select`. Table name:
   `pb_order_revenue`.
8. Save → Compile (check the SQL has a real `JOIN ... ON item_order_id = order_id`)
   → Run → verify:
   ```sql
   SELECT COUNT(*) FROM iceberg.gold.pb_order_revenue;              -- expect 98666 (unique order_ids in order_items)
   SELECT * FROM iceberg.gold.pb_order_revenue ORDER BY price_sum DESC LIMIT 5;
   ```

---

## 6. Scenario 5 (Intermediate+) — reuse your silver tables: customer 360

This scenario reuses the `pb_customers_clean` and `pb_orders_clean` tables you built
in Scenarios 2 and 3 — showing how pipelines chain together over time.

New pipeline: `pb_scenario5_customer_360`.

1. **source A**: `iceberg_table` → `silver` / `pb_orders_clean`.
2. **source B**: `iceberg_table` → `silver` / `pb_customers_clean`.
3. **transform** / `join` → main input = source A (orders), **"Join with"** = source B
   (customers), **join type** = `left`.
   - Both sides have a `customer_id` column — this time, instead of renaming, use
     the **"pro" technique**: qualify each side with its internal alias.
     Click source A, then the **"Copy ID"** button in its panel (something like
     `source_1699999999_2`) — you'll build the alias by prefixing it with `n_`.
     Do the same for source B.
   - **"ON condition"** → paste, replacing the two ids with your real copied ids:
     ```
     n_source_1699999999_2.customer_id = n_source_1699999999_5.customer_id
     ```
   > **Pro tip:** every node's SQL is wrapped in a CTE literally named `n_<node id>`.
   > Any join `ON` condition (or `select`/`derived_column` expression!) can reference
   > those CTE aliases directly — this is the general trick whenever two joined
   > tables share a column name and you don't want to rename it away.
4. **transform** / `select` → connect to `join`. **"Columns to keep"** (qualify
   `customer_id` with source A's alias so it's unambiguous — replace with your real id):
   ```
   order_id, n_source_1699999999_2.customer_id AS customer_id, order_status, order_purchase_timestamp, customer_unique_id, customer_city, customer_state
   ```
5. **destination** / `iceberg_gold` → table name `pb_customer_360`.
6. Save → Run → verify:
   ```sql
   SELECT COUNT(*) FROM iceberg.gold.pb_customer_360;  -- expect 99441
   SELECT customer_state, COUNT(*) FROM iceberg.gold.pb_customer_360 GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
   ```

---

## 7. Scenario 6 (Advanced) — pivot: payment method breakdown per order

New pipeline: `pb_scenario6_payment_pivot`.

1. **source**: `iceberg_table` → `bronze` / `olist_order_payments`.
2. **transform** / `pivot` → connect to source.
   - **"Group by columns"**: `order_id`
   - **"Pivot column"**: `payment_type`
   - **"Value column"**: `payment_value`
   - **"Pivot values"** — type **with the quote characters included**, exactly:
     ```
     'credit_card', 'boleto', 'voucher', 'debit_card'
     ```
     (the compiler inserts these values raw into `CASE WHEN payment_type = 'credit_card'
     THEN ...` — if you forget the quotes, you'll get an SQL syntax error on Run)
   - **"Aggregation"** → `sum`
3. **destination** / `iceberg_gold` → table name `pb_order_payment_breakdown`.
4. Save → Run → verify:
   ```sql
   SELECT * FROM iceberg.gold.pb_order_payment_breakdown
   WHERE credit_card IS NOT NULL ORDER BY credit_card DESC LIMIT 5;
   ```

---

## 8. Scenario 7 (Advanced) — window function: each customer's most recent order

New pipeline: `pb_scenario7_latest_order_per_customer`.

1. **source**: `iceberg_table` → `bronze` / `olist_orders`.
2. **transform** / `window` → connect to source.
   - **"New column name"**: `order_rank`
   - **"SQL window expression"**:
     ```
     ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_purchase_timestamp DESC)
     ```
3. **transform** / `filter` → connect to `window`. **"WHERE condition"**:
   ```
   order_rank = 1
   ```
4. **transform** / `select` → connect to `filter`. **"Columns to keep"**:
   ```
   order_id, customer_id, order_status, order_purchase_timestamp
   ```
5. **destination** / `iceberg_gold` → table name `pb_latest_order_per_customer`.
6. Save → Run → verify:
   ```sql
   SELECT COUNT(*) FROM iceberg.gold.pb_latest_order_per_customer;  -- expect 99441 (1 per customer_id)
   ```

---

## 9. Scenario 8 (Advanced) — variables + SQL + conditional branch

This is your first pipeline using the **advanced** node kinds (`variable`, `code`,
`control`) instead of just the basic source/transform/destination chain. These run on
a different (step-by-step) engine, so **Compile is not available** — go straight to
Save → Run.

Goal: check the platform's average review score; if it's healthy, write a gold
summary table; if it's not, run a stricter query instead.

New pipeline: `pb_scenario8_review_health_check`.

1. **variable** / `from_query` → drop it on the canvas.
   - **"Variable name"**: `avg_score`
   - **"SQL query"**:
     ```sql
     SELECT AVG(review_score) FROM iceberg.bronze.olist_order_reviews
     ```
2. **code** / `sql` → drop it, then **connect an edge from the `variable` node to
   this `code` node** (this matters — see the warning box below).
   - **"SQL query"**:
     ```sql
     SELECT 'avg score is {{avg_score}}' AS note
     ```
   - Leave "Store first result cell into variable" empty for now.
3. Save. **Watch the canvas**: if a small warning badge appears on the `code` node,
   hover over it — it will literally tell you which variable it needs and which node
   produces it, and suggest adding an edge. This live warning system is the platform's
   own built-in guide for advanced-node ordering — trust it over guessing.
4. Click **Run**. Open the `code` node after it finishes — its detail panel shows the
   real interpolated query and result (`avg score is 4.09` or similar).

**Now add the branch.** This is the most advanced UI mechanic in the builder: `if`
and `for_each` nodes render as a resizable dashed **frame** on the canvas. Any node
you physically drag *inside* that frame becomes a member that the `if`/`for_each`
node controls.

5. **control** / `if` → drop it on the canvas. You'll see it render as a frame
   (bigger rectangle), not a normal small card.
   - Click it, config **"Condition (Python expr over variables)"**:
     ```
     avg_score >= 3.5
     ```
6. Drag a **code** / `sql` node **into** the `if` frame (drop it so its center lands
   inside the dashed rectangle) — the frame's member counter should increase by one.
   This node only exists conceptually "inside" the if/else branch; whether it runs
   depends on the condition.
   - **"SQL query"**: `SELECT 'reviews look healthy' AS note`
7. Save → Run. Open the `if` node's detail panel — it will show whether the
   condition evaluated True/False and which nodes it ran/skipped.

You just built your first conditional pipeline. This is intentionally a small,
safe example — the platform's execution-order rules for advanced nodes are more
nuanced than the basic source→destination chain, so always re-check the on-canvas
warning badges after every edit rather than assuming an edge does what you expect.

---

## 10. Scenario 9 (Advanced) — union: flag risky orders from two branches

The **union** node stacks two node outputs together with `UNION ALL`. Here we build
two independent branches off the *same* source (one source node can feed more than
one downstream node — just draw two edges out of it) and union them back together.

New pipeline: `pb_scenario9_flagged_orders`.

1. **source**: `iceberg_table` → `bronze` / `olist_orders`. Call this node "orders".
2. **Branch A — cancelled orders.** `transform` / `filter` → connect to "orders".
   **"WHERE condition"**:
   ```
   order_status = 'canceled'
   ```
   > Real Olist data spells it the American way, one `l`: `canceled` (verified
   > against the actual CSV — `unavailable`, `invoice[d]`, `processing`, `shipped`,
   > `delivered`, `created`, `approved` are the other real values).
3. `transform` / `derived_column` → connect to that `filter` node.
   - **"New column name"**: `flag_reason`
   - **"SQL expression"**: `'CANCELLED'`
   > `derived_column` keeps every existing column and just adds one more
   > (`SELECT *, expr AS name FROM pred`) — that's why you don't need a `select`
   > node here too.
4. **Branch B — late deliveries.** `transform` / `filter` → connect to the same
   "orders" source node again (second edge out of it). **"WHERE condition"**:
   ```
   order_delivered_customer_date IS NOT NULL
   AND CAST(order_delivered_customer_date AS TIMESTAMP) > CAST(order_estimated_delivery_date AS TIMESTAMP)
   ```
   > Filter conditions are raw SQL, so you can `CAST` inline right there — you don't
   > need a separate `cast` node first just to compare two date strings.
5. `transform` / `derived_column` → connect to that second `filter` node.
   **"New column name"**: `flag_reason`. **"SQL expression"**: `'LATE_DELIVERY'`.
6. `transform` / `union` → connect the **first** `derived_column` node (Branch A) as
   its main input (draw the edge from it), then in the node's config, **"Union
   with"** dropdown → pick the **second** `derived_column` node (Branch B).
7. `transform` / `select` → connect to `union`. **"Columns to keep"**:
   ```
   order_id, customer_id, order_status, flag_reason
   ```
8. **destination** / `iceberg_gold` → table name `pb_flagged_orders`.
9. Save → Compile (you'll see a real `UNION ALL` between the two branch CTEs) →
   Run → verify:
   ```sql
   SELECT flag_reason, COUNT(*) FROM iceberg.gold.pb_flagged_orders GROUP BY 1;
   ```
   You should see two rows, one per `flag_reason` — some orders may even be
   double-counted (both cancelled **and** technically "late"), which is expected
   with `UNION ALL` (it never de-dupes) — see the next scenario for the node that
   fixes that.

---

## 11. Scenario 10 (Advanced) — deduplicate: prove the mechanic with a self-union

The clearest way to *see* what `deduplicate` actually does is to first artificially
create duplicates, then remove them again in the same pipeline.

New pipeline: `pb_scenario10_dedup_demo`.

1. **source**: `iceberg_table` → `bronze` / `olist_sellers`.
2. `transform` / `union` → connect the source as its main input, then in
   **"Union with"** pick **that same source node again**. This deliberately doubles
   every row (3095 → 6190).
3. `transform` / `deduplicate` → connect to `union`. **"Columns"**: `seller_id`.
   (This produces `ROW_NUMBER() OVER (PARTITION BY seller_id ORDER BY seller_id) AS rn`
   filtered to `rn = 1` under the hood — leave the field blank instead and it falls
   back to a plain `SELECT DISTINCT *`, which also works here since the two "copies"
   of each row are byte-for-byte identical.)
4. **destination** / `iceberg_gold` → table name `pb_sellers_dedup_demo`.
5. Save → Run → verify the round trip:
   ```sql
   SELECT COUNT(*) FROM iceberg.gold.pb_sellers_dedup_demo;  -- expect 3095, back to the original count
   ```
   Temporarily delete the edge into the `deduplicate` node (or bypass it) and point
   `union` straight at the destination instead, re-run, and you'll see 6190 — proof
   the `deduplicate` node is doing real work, not a no-op.

---

## 12. Scenario 11 (Advanced) — unpivot: product dimensions to long format

`unpivot` turns N "wide" columns into key/value row pairs (the opposite of `pivot`
from Scenario 6) — useful for a mart that needs one row per (product, dimension).

New pipeline: `pb_scenario11_product_dimensions_long`.

1. **source**: `iceberg_table` → `bronze` / `olist_products`.
2. `transform` / `cast` → connect to source. This normalizes the 4 numeric
   dimension columns to the same type so the `UNION ALL` branches `unpivot`
   generates underneath don't hit a type-mismatch error.
   - **Casts**: `product_weight_g → DOUBLE`, `product_length_cm → DOUBLE`,
     `product_height_cm → DOUBLE`, `product_width_cm → DOUBLE`
   - **Keep**: `product_id`
3. `transform` / `unpivot` → connect to `cast`.
   - **"ID columns"**: `product_id`
   - **"Value columns"**: `product_weight_g, product_length_cm, product_height_cm, product_width_cm`
   - **"Key column name"**: `dimension_name`
   - **"Value column name"**: `dimension_value`
4. **destination** / `iceberg_gold` → table name `pb_product_dimensions_long`.
5. Save → Run → verify:
   ```sql
   SELECT COUNT(*) FROM iceberg.gold.pb_product_dimensions_long;  -- expect 131804 (32951 products x 4 dimensions)
   SELECT * FROM iceberg.gold.pb_product_dimensions_long WHERE product_id = (SELECT MIN(product_id) FROM iceberg.gold.pb_product_dimensions_long);
   ```

---

## 13. Scenario 12 (Advanced) — fill_null + replace: clean up reviews into sentiment buckets

New pipeline: `pb_scenario12_review_sentiment`.

1. **source**: `iceberg_table` → `bronze` / `olist_order_reviews`.
2. `transform` / `fill_null` → connect to source. Many reviews have a blank/null
   comment — this replaces them with a readable placeholder instead of `NULL`.
   - **"Fills (column → default expression)"**: `review_comment_title →
     '(no title)'`, `review_comment_message → '(no comment)'`
   - **"Keep"**: `review_id, order_id, review_score, review_creation_date`
3. `transform` / `replace` → connect to `fill_null`. This turns the numeric
   `review_score` (1-5) into a text label using a `CASE WHEN` under the hood.
   - **"Column"**: `review_score`
   - **"Cases (old value → new value)"**: `1 → 'negative'`, `2 → 'negative'`,
     `3 → 'neutral'`, `4 → 'positive'`, `5 → 'positive'`
   - **"Keep"**: `review_id, order_id, review_comment_title, review_comment_message, review_creation_date`
   > The `replace` node's output column keeps the **same name** as the input
   > (`review_score`), just with new values/type (now text, not a number) — that's
   > why `review_score` must **not** also be in "Keep" (it would collide with itself).
4. **destination** / `iceberg_gold` → table name `pb_review_sentiment`.
5. Save → Run → verify:
   ```sql
   SELECT review_score, COUNT(*) FROM iceberg.gold.pb_review_sentiment GROUP BY 1 ORDER BY 2 DESC;
   ```
   You should see exactly 3 distinct label rows now (`positive`/`neutral`/`negative`)
   instead of 5 numeric ones.

---

## 14. Scenario 13 (Advanced) — sort + a range quality gate

New pipeline: `pb_scenario13_reviews_sorted`.

1. **source**: `iceberg_table` → `bronze` / `olist_order_reviews`.
2. `transform` / `sort` → connect to source. **"Columns"**:
   ```
   review_creation_date DESC
   ```
   > This is a **list** field, but it's split on commas only — a single entry like
   > `review_creation_date DESC` (space, no comma) stays intact as one raw ORDER BY
   > term, so appending `DESC`/`ASC` per column works fine.
3. `transform` / `quality` / `range` → connect to `sort`. **"Column"**:
   `review_score`. **"Min"**: `1`. **"Max"**: `5`.
4. **destination** / `iceberg_gold` → table name `pb_reviews_sorted`.
5. Save → Run — this should **pass** (real review scores are always 1-5) → verify:
   ```sql
   SELECT COUNT(*) FROM iceberg.gold.pb_reviews_sorted;  -- expect 104162
   ```
6. **Now break it on purpose.** Edit the `range` node: set **"Min"** to `2`. Save →
   Run again. The node turns red (plenty of real reviews score `1`), and — same
   rule as every quality gate — the destination never runs, so the table simply
   keeps its previous good data untouched. Set **"Min"** back to `1` when done.

---

## 15. Scenario 14 (Advanced) — a regex quality check, and a real zip-code gotcha

New pipeline: `pb_scenario14_customers_zip_validated`.

1. **source**: `iceberg_table` → `bronze` / `olist_customers`.
2. `transform` / `cast` → connect to source.
   - **Casts**: `customer_zip_code_prefix → VARCHAR`
   - **Keep**: `customer_id, customer_unique_id, customer_city, customer_state`
3. `transform` / `quality` / `regex` → connect to `cast`. **"Column"**:
   `customer_zip_code_prefix`. **"Pattern"** (no surrounding quotes needed, the UI
   field takes the raw regex text):
   ```
   ^[0-9]{1,5}$
   ```
   > **Gotcha worth knowing:** the real CSV has zip prefixes with leading zeros
   > (e.g. `"09790"`, `"01151"`). If your ingestion step inferred this column as an
   > **integer** type before it ever reached `bronze` (instead of keeping it as
   > text), those leading zeros are already gone forever (`09790` → `9790`) — which
   > is exactly why the pattern above allows `1` to `5` digits instead of requiring
   > exactly 5. This is a real, general lesson for any "code" field that happens to
   > look numeric (zip codes, phone numbers, IDs with leading zeros): always ingest
   > them as strings.
4. **destination** / `iceberg_gold` → table name `pb_customers_zip_validated`.
5. Save → Run → verify it passed:
   ```sql
   SELECT COUNT(*) FROM iceberg.gold.pb_customers_zip_validated;  -- expect 99441
   ```

---

## 16. Scenario 15 (Advanced) — a freshness quality check (and why it "fails" here on purpose)

New pipeline: `pb_scenario15_orders_freshness`.

1. **source**: `iceberg_table` → `bronze` / `olist_orders`.
2. `transform` / `cast` → connect to source. **Casts**:
   `order_purchase_timestamp → TIMESTAMP`. **Keep**: `order_id, customer_id, order_status`.
3. `transform` / `quality` / `freshness` → connect to `cast`. **"Column"**:
   `order_purchase_timestamp`. **"Max age (minutes)"**: `60`.
4. **destination** / `iceberg_gold` → table name `pb_orders_freshness_check`.
5. Save → Run. **This should fail** — every single row, because `freshness`
   compares the column against `current_timestamp` right now, and every real order
   in this dataset is from 2016-2018. This is **not a bug**: freshness checks are
   only meaningful against genuinely live/streaming data (like the Kafka/CDC bronze
   tables from the platform's streaming pipelines), never a static historical CSV
   dump. Don't "fix" this by loosening it to something silly — instead, prove the
   mechanic works correctly by setting **"Max age (minutes)"** to something absurdly
   large, e.g. `999999999` (about 1900 years), Save → Run again → now it passes.

---

## 17. Scenario 16 (Advanced) — api_ingestion: call a real public API and use the result

`api_ingestion` nodes call an outside REST API mid-pipeline. Here we fetch a live
USD→BRL exchange rate and use it to estimate the Olist order-item revenue in USD.

New pipeline: `pb_scenario16_revenue_in_usd`.

1. **variable** / `literal` → drop it. **"Variable name"**: `min_price`.
   **"Value"**: `50` (not used for computation below — just to show the `literal`
   variable type, the simplest one: a constant with no query).
2. **api_ingestion** / `rest_get` → drop it, connect an edge from the `literal`
   variable into it (keeps a deterministic run order).
   - **"URL"**: `https://api.frankfurter.app/latest?from=USD&to=BRL` (a free, no
     API-key-required currency exchange rate API — real network call, real JSON
     response)
   - **"Result variable"**: `fx_response`
3. **code** / `python` → connect an edge from the `api_ingestion` node into it.
   - **"Code"**:
     ```python
     variables['usd_to_brl'] = fx_response['rates']['BRL']
     ```
   > `code:python` nodes get the whole `variables` dict directly (no `{{ }}`
   > templating gymnastics needed) — you can read `fx_response` because it's just
   > another key already sitting in that same dict from the previous step.
4. **code** / `sql` → connect an edge from that `python` node into it.
   - **"SQL query"**:
     ```sql
     SELECT SUM(price) AS total_revenue_brl, SUM(price) / {{usd_to_brl}} AS total_revenue_usd_estimate
     FROM iceberg.bronze.olist_order_items
     ```
5. Save → Run. Open the last `code` node's detail panel — it shows the real
   interpolated query (the actual fetched exchange rate substituted in) and the
   real result row.

---

## 18. Scenario 17 (Advanced) — control:for_each — loop over a list and accumulate results

`for_each` renders as a frame, same as `if` from Scenario 8 — any node dragged
inside it becomes part of the loop body, run once per item.

New pipeline: `pb_scenario17_orders_per_state`.

1. **variable** / `from_query` → drop it. **"Variable name"**: `states_list`.
   **"SQL query"**:
   ```sql
   SELECT ARRAY['SP', 'RJ', 'MG', 'RS', 'PR']
   ```
   (the 5 states with the most customers in the real dataset, in order: SP 41746,
   RJ 12852, MG 11635, RS 5466, PR 5045 — verified against the actual CSV)
2. **code** / `python` → connect an edge from `states_list` into it. This
   initializes the accumulator **before** the loop runs.
   - **"Code"**: `variables['state_counts'] = []`
3. **control** / `for_each` → drop it (renders as a frame), connect an edge from the
   `python` init node into it.
   - **"Items variable"**: `states_list`
   - **"Item variable"**: `state`
4. Drag a **code** / `sql` node **into** the `for_each` frame.
   - **"SQL query"**:
     ```sql
     SELECT COUNT(*) AS n FROM iceberg.bronze.olist_customers WHERE customer_state = '{{state}}'
     ```
   - **"Store first result cell into variable"**: `state_count`
5. Drag a second **code** / `python` node **into the same frame**, positioned after
   the SQL node (order inside the frame matters — this is the 2nd body step).
   - **"Code"**:
     ```python
     variables['state_counts'].append({'state': variables['state'], 'count': variables['state_count']})
     ```
6. Save → Run. Open the `for_each` node's detail panel — it lists each iteration it
   ran. Open the last `python` node — its variables snapshot should show
   `state_counts` with 5 entries, one per state, each with a real count.

---

## 19. Scenario 18 (Advanced) — sub_pipeline:call — reuse a whole pipeline as one node

First build a tiny, reusable **helper** pipeline:

1. New pipeline: `pb_helper_customer_count_check`.
2. **variable** / `from_query` → **"Variable name"**: `customer_count`.
   **"SQL query"**: `SELECT COUNT(*) FROM iceberg.bronze.olist_customers`.
3. **code** / `sql` → connect an edge from the variable into it. **"SQL query"**:
   `SELECT 'customer count is {{customer_count}}' AS note`.
4. Save (don't schedule it — this pipeline is only ever meant to be called by
   another one).

`sub_pipeline:call` needs the helper's **pipeline ID**, which isn't shown anywhere
in the UI — fetch it from Postgres:

```powershell
docker compose exec postgres psql -U openlakehouse -d openlakehouse -c "select id, name from pipelines where name='pb_helper_customer_count_check';"
```

Copy the `id` (a UUID). Now build the caller:

5. New pipeline: `pb_scenario18_master_calls_helper`.
6. **sub_pipeline** / `call` → drop it.
   - **"Pipeline to call (ID)"**: paste the UUID you copied
   - **"Pass variables"**: `true`
7. Save → Run. Open the `sub_pipeline` node's detail panel — it shows the helper
   pipeline's own run result nested inside.

---

## 20. Scheduling a pipeline

Any pipeline (basic or advanced) can run on a cron schedule instead of only manually.

1. Open any pipeline you built above (e.g. `pb_scenario3_orders_clean`).
2. In the left sidebar, open **"Pipeline settings"** at the bottom.
3. **Schedule** dropdown → try `Daily` (pick a time), or `Custom cron…` and type e.g.
   `*/15 * * * *` to run every 15 minutes.
4. Save.
5. Check `http://localhost/jobs` — the Jobs page polls Dagster, which reads every
   saved pipeline's own schedule and fires a real run at the next matching tick
   (dedup'd per pipeline+tick, so it won't double-run).

Turn the schedule back to **"No schedule (manual only)"** when you're done
experimenting, so it doesn't keep re-running in the background.

---

## 21. dbt chapter

Now switch to `http://localhost/dbt`. Three things live there: a **Run** panel
(command dropdown, `--select` box, full-refresh checkbox, live stdout/stderr), a
**models list** grouped by layer (staging / intermediate / marts), a **run history**
table, and a **"Project files"** panel (browse/view existing files, and a **"+ New"**
button that can *create* new models/macros/snapshots/tests — but cannot edit
existing files).

Your dbt project lives on your host machine at
`infra/dbt/dbt_project/` — the `dbt` container bind-mounts this exact folder
(`docker-compose.yml`: `./infra/dbt/dbt_project:/usr/app/dbt`), so **you can open and
edit any file in that folder directly in VS Code**; changes apply on the very next
`dbt run` (no rebuild/restart needed). This matters for the one file the "+ New"
button *cannot* touch: `_sources.yml`.

### 21.1 Declare your Olist bronze tables as dbt sources

dbt needs to know your bronze tables exist before any model can `{{ source(...) }}`
them. Open `infra/dbt/dbt_project/models/staging/_sources.yml` in your editor. It
currently has one `bronze` source block with a short `tables:` list. Add your Olist
tables to that same list, e.g.:

```yaml
version: 2

sources:
  - name: bronze
    schema: bronze
    tables:
      - name: orders
      - name: customers_cdc
      - name: orders_cdc
      - name: olist_orders
      - name: olist_customers
      - name: olist_order_items
      - name: olist_order_payments
      - name: olist_order_reviews
```

Save the file. That's it — no restart needed, dbt reads it fresh every run.

### 21.2 Staging layer: your first dbt model via the UI

1. On `/dbt`, click **"+ New"** in the Project files panel.
2. **Element type** → `Model`. **Layer** → `staging`. **Materialization** → `view`.
3. **Name** → `stg_olist_orders`.
4. Replace the pre-filled SQL body with:
   ```sql
   {{ config(materialized='view') }}

   select
       order_id,
       customer_id,
       order_status,
       cast(order_purchase_timestamp as timestamp) as order_purchase_ts,
       cast(order_delivered_customer_date as timestamp) as order_delivered_ts,
       cast(order_estimated_delivery_date as timestamp) as order_estimated_ts
   from {{ source('bronze', 'olist_orders') }}
   ```
5. Click **Create**. The file appears immediately in the models list under
   `staging`.
6. Repeat for `stg_olist_customers` (source `olist_customers`, just pass through
   `customer_id, customer_unique_id, customer_city, customer_state`) and
   `stg_olist_order_items` (source `olist_order_items`, pass through
   `order_id, product_id, seller_id, price, freight_value`).
7. In the **Run** panel: command `run`, **select** box → `stg_olist_orders`, click
   **Run**. Watch the live stdout — it should end with `Completed successfully`.
8. Verify in the SQL Editor:
   ```sql
   SELECT COUNT(*) FROM iceberg.dbt_staging.stg_olist_orders;
   ```
   > Note the schema is `dbt_staging`, **not** `silver` — dbt models physically land
   > in their own `dbt_staging`/`dbt_intermediate`/`dbt_marts` schemas (set by
   > `dbt_project.yml`'s per-layer `+schema` config), completely separate from the
   > medallion `bronze`/`silver`/`gold` schemas the Pipeline Builder writes to. Two
   > different systems, same underlying Trino/Iceberg warehouse.

### 21.3 Intermediate layer: join staging models

1. **"+ New"** → Model → layer `intermediate` → materialization `table` → name
   `int_olist_orders_enriched`.
2. Body:
   ```sql
   {{ config(materialized='table') }}

   select
       o.order_id,
       o.customer_id,
       o.order_status,
       o.order_purchase_ts,
       c.customer_unique_id,
       c.customer_city,
       c.customer_state,
       i.product_id,
       i.seller_id,
       i.price,
       i.freight_value
   from {{ ref('stg_olist_orders') }} o
   left join {{ ref('stg_olist_customers') }} c on o.customer_id = c.customer_id
   left join {{ ref('stg_olist_order_items') }} i on o.order_id = i.order_id
   ```
3. Create it, then Run panel → `run` → select `int_olist_orders_enriched` (this
   automatically also needs its parents built once — if you get a "relation not
   found" error, first run `stg_olist_orders stg_olist_customers stg_olist_order_items`
   as a space-separated select, or simply select `+int_olist_orders_enriched` which
   tells dbt to include upstream parents too).

### 21.4 Marts layer + a real test

1. **"+ New"** → Model → layer `marts` → materialization `table` → name
   `mart_olist_daily_revenue`.
2. Body:
   ```sql
   {{ config(materialized='table') }}

   select
       date(order_purchase_ts) as order_date,
       count(distinct order_id) as order_count,
       sum(price) as total_revenue,
       sum(freight_value) as total_freight
   from {{ ref('int_olist_orders_enriched') }}
   group by 1
   ```
3. Create it, run panel → select `+mart_olist_daily_revenue` (the `+` prefix means
   "and everything upstream it depends on") → Run.
4. Verify:
   ```sql
   SELECT * FROM iceberg.dbt_marts.mart_olist_daily_revenue ORDER BY order_date DESC LIMIT 5;
   ```
5. Add a schema test. The "+ New" form does not support creating/editing schema YAML
   (only `.sql` model files), so open
   `infra/dbt/dbt_project/models/marts/_marts.yml` directly in your editor (create the
   `models:` list if it doesn't exist yet) and add:
   ```yaml
     - name: mart_olist_daily_revenue
       columns:
         - name: order_date
           tests: [not_null, unique]
   ```
6. Run panel → command `test` → select `mart_olist_daily_revenue` → Run. Confirm
   `PASS` in the stdout for both tests.

### 21.5 Run a dbt node from inside the Pipeline Builder

Now connect the two systems: a `dbt` node inside a No-Code pipeline.

1. Back on `/pipelines`, new pipeline `pb_scenario9_dbt_build`.
2. Palette → **dbt** group → click **build**.
3. Click the node. Config:
   - **"dbt --select (model/tag, supports {{var}})"** → `+mart_olist_daily_revenue`
     (this field is **mandatory** inside a pipeline — leaving it empty fails the node
     with `dbt node requires config.select`, unlike the standalone `/dbt` page where
     a blank select just means "everything")
   - **"Full refresh (true/false)"** → `false`
4. No edges needed for a single-node pipeline. Save → Run (there's no Compile for
   dbt/advanced pipelines — go straight to Run).
5. Open the node's detail panel — it shows the real dbt stdout tail, same as the
   `/dbt` page's Run panel.

You've now built a pipeline that mixes the No-Code Builder with dbt — the same
building block (a `dbt` node) can sit inside a bigger pipeline alongside
source/transform/quality/destination or variable/code/control nodes, letting you
orchestrate raw-SQL transforms and dbt-managed transforms from one place.

### 21.6 A reusable macro

You've actually already been using a macro without realizing it —
`infra/dbt/dbt_project/macros/get_custom_schema.sql` is what makes every model land
in exactly `dbt_staging`/`dbt_intermediate`/`dbt_marts` instead of some
double-prefixed schema name. Now write your own.

1. On `/dbt`, **"+ New"** → **Element type** → `Macro`. **Name** →
   `bucket_review_score`.
2. Body:
   ```sql
   {% macro bucket_review_score(column_name) %}
       case
           when {{ column_name }} <= 2 then 'negative'
           when {{ column_name }} = 3 then 'neutral'
           else 'positive'
       end
   {% endmacro %}
   ```
3. Create it, then **"+ New"** → **Model** → layer `staging` → materialization
   `view` → name `stg_olist_reviews`. Body:
   ```sql
   {{ config(materialized='view') }}

   select
       review_id,
       order_id,
       review_score,
       {{ bucket_review_score('review_score') }} as review_sentiment
   from {{ source('bronze', 'olist_order_reviews') }}
   ```
4. Run panel → `run` → select `stg_olist_reviews` → Run → verify:
   ```sql
   SELECT review_sentiment, COUNT(*) FROM iceberg.dbt_staging.stg_olist_reviews GROUP BY 1;
   ```
   Any model anywhere in the project can now call `{{ bucket_review_score(...) }}` —
   that's the whole point of a macro, one SQL fragment reused everywhere.

### 21.7 Incremental materialization + full-refresh

Every model you've built so far is `materialized='table'` — a full rebuild
(`CREATE OR REPLACE TABLE AS SELECT`) on every run. `incremental` only processes
**new** rows on top of the existing table, and this is also the only
materialization where the Run panel's **"Full refresh"** checkbox actually changes
anything.

1. **"+ New"** → Model → layer `intermediate` → materialization `table` (you'll
   override it inside the SQL body instead, since the dropdown here just pre-fills
   the `{{ config(...) }}` line) → name `int_olist_orders_incremental`.
2. Body:
   ```sql
   {{ config(materialized='incremental', unique_key='order_id') }}

   select
       order_id,
       customer_id,
       order_status,
       order_purchase_ts
   from {{ ref('stg_olist_orders') }}

   {% if is_incremental() %}
   where order_purchase_ts > (select coalesce(max(order_purchase_ts), timestamp '1970-01-01') from {{ this }})
   {% endif %}
   ```
3. Run panel → `run` → select `int_olist_orders_incremental` (first run: the table
   doesn't exist yet, so `is_incremental()` is `false` and the `{% if %}` block is
   skipped entirely — full initial load) → verify:
   ```sql
   SELECT COUNT(*) FROM iceberg.dbt_intermediate.int_olist_orders_incremental;  -- expect 99441
   ```
4. Run the **exact same** `run` → select `int_olist_orders_incremental` again,
   **without** checking "Full refresh". This time `is_incremental()` is `true` and
   the `WHERE` filter compares against `{{ this }}` (the table's own current max
   timestamp) — since nothing new arrived, dbt appends **0** rows. Re-run the count
   query above: still 99441, no duplicates.
5. Now check the **"Full refresh"** checkbox → Run again. This forces dbt to drop
   and fully rebuild the table from scratch (ignoring the incremental filter for
   this one run) — same 99441 rows, but via a completely different code path. This
   is the checkbox's entire purpose: force a clean rebuild of an `incremental`
   model, e.g. after you've changed its SQL logic and old accumulated rows would
   otherwise be wrong.

### 21.8 Snapshot: SCD Type 2 on customer city/state

Snapshots track **row-level history over time** — instead of overwriting a row when
it changes, dbt keeps the old version (with `dbt_valid_from`/`dbt_valid_to`
timestamps) and adds a new one. The Olist CSVs are a static historical dump with no
built-in "this changed" signal, so we'll create one ourselves with a real `UPDATE`.

1. **"+ New"** → **Element type** → `Snapshot`. **Name** →
   `snap_olist_customers_city`.
2. Body:
   ```sql
   {% snapshot snap_olist_customers_city %}
   {{
       config(
           target_schema='dbt_snapshots',
           unique_key='customer_id',
           strategy='check',
           check_cols=['customer_city', 'customer_state']
       )
   }}
   select customer_id, customer_city, customer_state
   from {{ source('bronze', 'olist_customers') }}
   {% endsnapshot %}
   ```
   > `strategy='check'` compares the actual **values** of `check_cols` between runs
   > (instead of `strategy='timestamp'`, which needs a real "last updated" column —
   > we don't have one here, so `check` is the right choice for this dataset).
3. There's no dedicated "snapshot" command in the Run panel — `dbt build` runs
   snapshots too (in dependency order alongside models/tests), so: Run panel →
   command `build` → select `snap_olist_customers_city` → Run.
   (Equivalent raw CLI, if you'd rather run it directly:
   `docker compose exec dbt dbt snapshot --select snap_olist_customers_city`.)
4. Verify the first version exists:
   ```sql
   SELECT customer_id, customer_city, dbt_valid_from, dbt_valid_to
   FROM iceberg.dbt_snapshots.snap_olist_customers_city LIMIT 5;
   -- dbt_valid_to should be NULL for every row - all current
   ```
5. **Simulate a real change.** In the SQL Editor, pick one customer and note its
   current city:
   ```sql
   SELECT customer_id, customer_city FROM iceberg.bronze.olist_customers LIMIT 1;
   ```
   Copy the `customer_id` value, then update that row for real:
   ```sql
   UPDATE iceberg.bronze.olist_customers
   SET customer_city = 'rio de janeiro'
   WHERE customer_id = '<paste the id you copied>';
   ```
   (If your Trino version rejects a plain `UPDATE` on this table, use
   `MERGE INTO iceberg.bronze.olist_customers t USING (SELECT '<id>' AS customer_id) s ON t.customer_id = s.customer_id WHEN MATCHED THEN UPDATE SET customer_city = 'rio de janeiro'` instead — same effect.)
6. Run panel → `build` → select `snap_olist_customers_city` again.
7. Verify you now have **two** rows for that one `customer_id`:
   ```sql
   SELECT customer_id, customer_city, dbt_valid_from, dbt_valid_to
   FROM iceberg.dbt_snapshots.snap_olist_customers_city
   WHERE customer_id = '<paste the id you copied>';
   ```
   The old row now has a real `dbt_valid_to` timestamp (when it stopped being
   current), and the new row has `dbt_valid_to IS NULL` (it's the current one) —
   that's a genuine SCD Type 2 history, built from two real dbt runs.

### 21.9 A singular test (custom SQL, not a schema test)

The `not_null`/`unique` tests from §21.4 are **schema tests** (declared in YAML,
reused across columns). A **singular test** is just a raw `.sql` file — any row it
returns counts as a failure.

1. **"+ New"** → **Element type** → `Test`. **Name** → `assert_positive_prices`.
2. Body:
   ```sql
   select *
   from {{ ref('int_olist_orders_enriched') }}
   where price <= 0
   ```
3. Run panel → command `test` → select `assert_positive_prices` → Run. Real Olist
   prices are always positive, so this should `PASS` (0 rows returned = pass).

### 21.10 Tags: selecting models across layers at once

Tags let you group models by *purpose* instead of by folder/layer — e.g. mark
several models across different layers as part of one "nightly batch" and run all
of them with one `--select`, regardless of which layer folder they live in.

1. Open `infra/dbt/dbt_project/models/marts/mart_olist_daily_revenue.sql` directly
   in your editor (this is a plain `.sql` file edit, same bind-mount as `_sources.yml`
   and `_marts.yml`) and add a tag to its existing config line:
   ```sql
   {{ config(materialized='table', tags=['nightly']) }}
   ```
2. Do the same to `models/intermediate/int_olist_orders_incremental.sql`:
   ```sql
   {{ config(materialized='incremental', unique_key='order_id', tags=['nightly']) }}
   ```
3. Run panel → command `run` → **select** box → `tag:nightly` → Run. Watch the
   stdout — it builds **both** models in one command, even though one lives under
   `intermediate/` and the other under `marts/`, purely because they share the tag.

---

## 22. Scenario 19 (Capstone) — one pipeline mixing everything: basic + quality + variables + a branch + dbt

This is the big one: a single pipeline that starts as a plain basic
source→transform→destination chain, adds a quality gate, then hands off to the
advanced engine (variable → conditional branch → a `dbt build` node), proving all
of it can live together in one graph exactly like the platform's own reference
pattern for "mixed" pipelines.

New pipeline: `pb_scenario19_capstone`.

**Part A — a real basic chain that actually writes data:**

1. **source**: `iceberg_table` → `bronze` / `olist_order_reviews`.
2. `transform` / `aggregate` → connect to source. **"Group by columns"**: *(leave
   empty — this aggregates the whole table into one row)*. **"Aggregations"**:
   `review_score → avg`.
3. **destination** / `iceberg_gold` → connect to `aggregate`. Table name:
   `pb_capstone_avg_score`.

**Part B — advanced nodes that read what Part A just wrote:**

4. **variable** / `from_query` → connect an edge **from the destination node** into
   this variable node (important — this is what forces Part A to fully finish and
   physically write the table before Part B tries to read it back).
   - **"Variable name"**: `avg_score`
   - **"SQL query"**: `SELECT review_score_avg FROM iceberg.gold.pb_capstone_avg_score`
5. **control** / `if` → connect an edge from the `variable` node into it (renders as
   a frame).
   - **"Condition"**: `avg_score >= 4.0`
6. Drag a **dbt** / `build` node **into** the `if` frame.
   - **"dbt --select"**: `+mart_olist_daily_revenue`
   - **"Full refresh"**: `false`
   (this reuses the mart you built in §21.4 — complete that section first if you
   haven't yet)
7. Save. Check the canvas for warning badges (per Scenario 8's advice) — with the
   edges above in place there shouldn't be any.
8. Run. Open each node's detail panel top to bottom: the `aggregate`→destination
   pair shows the real average score it computed, the `variable` node shows it read
   that same number back out of Iceberg, the `if` node shows which way the
   condition went, and — if the condition was true — the `dbt` node shows a real
   `dbt build` stdout tail for the mart.

You've now built one graph containing **every single kind** this platform
supports: `source`, `transform`, `quality` (in earlier scenarios), `destination`,
`variable`, `control`, and `dbt` — proving they're all just nodes in the same
engine, not separate tools bolted together.

---

## 23. Cheat sheet — errors you'll likely see and what they mean

| Error | Cause | Fix |
|---|---|---|
| `select node ... requires config.columns` | "Columns to keep" list is empty | Type at least one column |
| `join node ... requires config.right_node and config.on` | Forgot to pick "Join with" or leave ON blank | Fill both fields |
| `Column '...' is ambiguous` (on Run, not Compile) | Both join sides have a same-named column, referenced unqualified | Rename one side first (Scenario 4), or qualify with `n_<node id>.` (Scenario 5) |
| Pivot values produce a SQL syntax error at the value | Forgot to include the quote characters in the "Pivot values" field | Type `'credit_card', 'boleto'` literally, quotes included |
| Re-running a pipeline doesn't change the destination table | `CREATE TABLE IF NOT EXISTS` is a no-op if the table already exists | `DROP TABLE iceberg.<schema>.<table>;` in the SQL Editor first |
| Quality node turns red and the destination never runs | Quality gates really block downstream writes on any violation (`row_count` compares min/max instead) | Fix the underlying data or loosen the check |
| `dbt node {id} requires config.select` | Left "select" blank on a `dbt` pipeline node | Unlike the standalone `/dbt` page, this field is mandatory inside a pipeline |
| dbt `Compilation Error: ... is not a valid source table` | Forgot to add the table to `_sources.yml` | Edit `infra/dbt/dbt_project/models/staging/_sources.yml` directly (see §21.1) |
| dbt model lands in an unexpected schema | dbt physically writes to `dbt_staging`/`dbt_intermediate`/`dbt_marts`, not `bronze`/`silver`/`gold` | This is expected — the two systems use separate schemas on purpose |
| Advanced-node pipeline (`variable`/`code`/`control`/`dbt`) has no "Compile" button | Only pure source/transform/quality/destination pipelines compile to one SQL statement | Save and Run directly; watch the on-canvas warning badges for ordering issues |
| `quality:row_count` node's config panel says "No configuration needed for this node" | This node type's field spec is currently an empty list in the UI, so `min`/`max` aren't settable from the form (not even the "Advanced: raw JSON" fallback, which only appears when there's at least one real field) | Known UI gap — use `range`/`not_null`/`unique`/`regex`/`freshness` instead, which all have real config fields (Scenarios 2, 13, 14, 15) |
| `union`/`unpivot` node fails with a type-mismatch error | The two branches (or the value columns being stacked) have different column types | Add a `cast` node before the union/unpivot to normalize types first (Scenario 11) |
| `replace` node's output column disappears from "Keep" as a duplicate | `replace`'s output keeps the **same column name** as the input column, so it can't also be listed in "Keep" | Leave the original column name out of "Keep" — the replaced version already includes it (Scenario 12) |
| `freshness` quality check fails on every row of historical data | It compares the column against `current_timestamp` right now — meaningless on a static CSV dump, only useful for live/streaming data | Expected on this dataset; don't loosen it to "fix" it — that defeats the check's purpose (Scenario 15) |
| `for_each`/`if` frame has 0 members after adding a node | The node's *center point* has to land inside the dashed rectangle, not just overlap its edge | Drag the node further toward the middle of the frame and re-check the member counter |
| `sub_pipeline` node fails with "pipeline not found" | The pasted `pipeline_id` is wrong, or has a typo (it's plain text, no dropdown/validation) | Re-fetch the exact UUID via `docker compose exec postgres psql -c "select id, name from pipelines;"` (Scenario 18) |
| dbt `build`/`test` says a snapshot/test/macro file isn't found | Wrote it as a plain `select` instead of wrapping it in `{% snapshot ... %}{% endsnapshot %}` (snapshots only), or has a name typo | Match the exact block syntax from §21.8, and make sure `--select` uses the same name as the file |
| Re-running an `incremental` model doesn't pick up a SQL logic change you made | Incremental models only apply new logic to **new** rows going forward, old rows already loaded keep the old logic's output | Check "Full refresh" in the Run panel once to force a full rebuild (§21.7) |

---

## 24. Cleanup (optional)

Everything in this guide is prefixed `pb_` so you can wipe it in one pass when done
experimenting:

```sql
-- run these one at a time in the SQL Editor
DROP TABLE IF EXISTS iceberg.silver.pb_sellers_raw;
DROP TABLE IF EXISTS iceberg.silver.pb_customers_clean;
DROP TABLE IF EXISTS iceberg.silver.pb_orders_clean;
DROP TABLE IF EXISTS iceberg.gold.pb_order_revenue;
DROP TABLE IF EXISTS iceberg.gold.pb_customer_360;
DROP TABLE IF EXISTS iceberg.gold.pb_order_payment_breakdown;
DROP TABLE IF EXISTS iceberg.gold.pb_latest_order_per_customer;
DROP TABLE IF EXISTS iceberg.gold.pb_flagged_orders;
DROP TABLE IF EXISTS iceberg.gold.pb_sellers_dedup_demo;
DROP TABLE IF EXISTS iceberg.gold.pb_product_dimensions_long;
DROP TABLE IF EXISTS iceberg.gold.pb_review_sentiment;
DROP TABLE IF EXISTS iceberg.gold.pb_reviews_sorted;
DROP TABLE IF EXISTS iceberg.gold.pb_customers_zip_validated;
DROP TABLE IF EXISTS iceberg.gold.pb_orders_freshness_check;
DROP TABLE IF EXISTS iceberg.gold.pb_capstone_avg_score;
DROP TABLE IF EXISTS iceberg.dbt_marts.mart_olist_daily_revenue;
DROP TABLE IF EXISTS iceberg.dbt_intermediate.int_olist_orders_enriched;
DROP TABLE IF EXISTS iceberg.dbt_intermediate.int_olist_orders_incremental;
DROP VIEW  IF EXISTS iceberg.dbt_staging.stg_olist_orders;
DROP VIEW  IF EXISTS iceberg.dbt_staging.stg_olist_customers;
DROP VIEW  IF EXISTS iceberg.dbt_staging.stg_olist_order_items;
DROP VIEW  IF EXISTS iceberg.dbt_staging.stg_olist_reviews;
DROP TABLE IF EXISTS iceberg.dbt_snapshots.snap_olist_customers_city;
```

Also undo the one live data edit from §21.8's snapshot demo, so `bronze.olist_customers`
is back to its original state:

```sql
-- only needed if you actually ran the UPDATE in §21.8
-- (there's no real "original value" to restore to programmatically -
--  re-import data/olist-ecom/olist_customers_dataset.csv if you need it pristine again)
```

Then delete the pipelines themselves from the Pipeline Builder's left sidebar
(**Delete** button), and optionally remove the `.sql` files you created under
`infra/dbt/dbt_project/models/`, `macros/`, `snapshots/`, and `tests/`, and the
Olist lines you added to `_sources.yml`/`_marts.yml`.
