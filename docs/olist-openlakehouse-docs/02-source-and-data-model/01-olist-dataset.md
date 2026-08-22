# 01 — The Olist Dataset

**Content type: CURRENT PLATFORM CAPABILITY** (the dataset itself, as
distributed by Kaggle) — no platform involvement yet, this document is
pure source-data reference.

## Purpose

Give one authoritative reference for every source table's shape, grain,
and the dataset's single most important modeling trap, before any
ingestion or modeling work begins.

## The 9 source files

| File | Grain | Real row count (post-ingestion) | Natural key |
|---|---|---|---|
| `olist_customers_dataset.csv` | one row per **order's** customer record | 99,441 | `customer_id` (per-order, **not** a person) |
| `olist_orders_dataset.csv` | one row per order | 99,441 | `order_id` |
| `olist_order_items_dataset.csv` | one row per order line item | 112,650 | `order_id` + `order_item_id` |
| `olist_order_payments_dataset.csv` | one row per payment installment/method | 103,886 | `order_id` + `payment_sequential` |
| `olist_order_reviews_dataset.csv` | one row per review | 104,162 | `review_id` |
| `olist_products_dataset.csv` | one row per product | 32,951 | `product_id` |
| `olist_sellers_dataset.csv` | one row per seller | 3,095 | `seller_id` |
| `product_category_name_translation.csv` | one row per category | 71 | `product_category_name` |
| `olist_geolocation_dataset.csv` | one row per zip-prefix/lat/lng observation (many-to-many with zip prefix) | ~1,000,163 | none (not unique per zip prefix) |

## The #1 modeling trap: `customer_id` vs. `customer_unique_id`

`olist_customers_dataset.csv` has **both** a `customer_id` column and a
`customer_unique_id` column. This is the most consequential fact in the
entire dataset:

- `customer_id` is generated **fresh for every order** — it is really an
  "order's customer record," not a person.
- `customer_unique_id` is the actual stable identifier for a real human
  customer across multiple orders.

**Consequence**: if `dim_customers` is built keyed on `customer_id`, every
"repeat customer" analysis will show ~0% repeat rate, because almost no
`customer_id` value appears on more than one order — even though the same
*person* (`customer_unique_id`) may have ordered many times. This exact
trap is why `02-business-context.md`'s cautionary example #1 exists, and
why `05-grain-analysis.md` and `07-dimensional-modeling/03-scd2-source-
identification.md` both call it out as the natural key decision to get
right before writing a single line of dimension-building SQL.

## Column reference (key columns only — full profiling in the next document)

- **orders**: `order_id`, `customer_id`, `order_status` (8 real values:
  `delivered`, `shipped`, `canceled`, `unavailable`, `invoiced`,
  `processing`, `created`, `approved`), `order_purchase_timestamp`,
  `order_approved_at`, `order_delivered_carrier_date`,
  `order_delivered_customer_date`, `order_estimated_delivery_date`.
- **order_items**: `order_id`, `order_item_id`, `product_id`, `seller_id`,
  `shipping_limit_date`, `price`, `freight_value`.
- **order_payments**: `order_id`, `payment_sequential`, `payment_type`
  (`credit_card`, `boleto`, `voucher`, `debit_card`, `not_defined`),
  `payment_installments`, `payment_value`.
- **order_reviews**: `review_id`, `order_id`, `review_score` (1-5),
  `review_comment_title`, `review_comment_message` (nullable, contains
  embedded newlines in some rows — see the CSV-parsing gotcha in
  `00-project-overview/06-prerequisites.md`), `review_creation_date`,
  `review_answer_timestamp`.
- **products**: `product_id`, `product_category_name` (Portuguese; joins
  to the translation file), `product_name_lenght`,
  `product_description_lenght`, `product_photos_qty`,
  `product_weight_g`, `product_length_cm`, `product_height_cm`,
  `product_width_cm`.
- **sellers**: `seller_id`, `seller_zip_code_prefix`, `seller_city`,
  `seller_state`.
- **customers**: `customer_id`, `customer_unique_id`,
  `customer_zip_code_prefix`, `customer_city`, `customer_state`.

## Next document

[`02-source-data-profiling.md`](02-source-data-profiling.md).
