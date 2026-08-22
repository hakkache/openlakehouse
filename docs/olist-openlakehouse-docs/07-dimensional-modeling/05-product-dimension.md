# 05 — Product Dimension

**Content type: PROJECT IMPLEMENTATION.**

## The real modeling decision: joining in the category translation table

`olist_products.product_category_name` is in Portuguese —
`product_category_name_translation` maps it to English. `dim_products`
must join these correctly, including the rows where no translation
exists.

## Hands-On Walkthrough

1. First check for a real edge case, in **SQL Editor**:
   ```sql
   SELECT p.product_category_name
   FROM iceberg.silver.olist_products p
   LEFT JOIN iceberg.bronze.category_translation t
     ON p.product_category_name = t.product_category_name
   WHERE p.product_category_name IS NOT NULL AND t.product_category_name IS NULL
   LIMIT 5;
   ```
   **Expected result**: check whether any rows come back — if the Olist
   dataset's translation table has any category present in `products` but
   missing from the translation file, this reveals it directly (a real
   possible data-quality gap, not assumed away).
2. Create pipeline `dim_products_build`. Source A: `schema = silver`,
   `table = olist_products`. Source B: `schema = bronze`,
   `table = category_translation`.
3. Add a **join** node: `right_node = <source B>`,
   `on = product_category_name = product_category_name`,
   `join_type = left` (must be `left`, not `inner` — confirmed necessary
   by step 1's check).
4. Add a **fill_null** node: `fills = {"product_category_name_english":
   "'unknown'"}` — handles exactly the gap (if any) found in step 1,
   rather than leaving a silent `NULL` category in the dimension.
5. Add a **derived_column** node: `name = product_key`,
   `expression = row_number() over (order by product_id)`.
6. Destination `iceberg_gold` / `dim_products`, run, verify:
   ```sql
   SELECT count(*) FROM iceberg.gold.dim_products;
   ```
   **Expected result**: `32951` — the `left join` must not change the row
   count from the source `olist_products` table (an `inner join` here
   would silently drop any product whose category has no translation —
   verify this yourself by temporarily switching to `inner join` and
   comparing counts, then reverting).

> 🧪 **Checkpoint**: `dim_products` has exactly `32951` rows, and you've
> confirmed with a real before/after comparison that `left join` (not
> `inner join`) is what preserves that count.

## Next document

[`06-seller-dimension.md`](06-seller-dimension.md).
