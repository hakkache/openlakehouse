# 02 — Entity-Relationship Model

**Content type: PROJECT IMPLEMENTATION.** A visual/reference companion to
the dimensional model built across module 07.

## The real, complete ER diagram for the Olist Gold layer

```mermaid
erDiagram
    dim_customers ||--o{ fact_orders : "customer_key"
    dim_date ||--o{ fact_orders : "purchase_date_key"
    dim_date ||--o{ fact_orders : "delivery_date_key (role-playing)"
    fact_orders ||--o{ fact_order_items : "order_id"
    dim_products ||--o{ fact_order_items : "product_key"
    dim_sellers ||--o{ fact_order_items : "seller_key"
    dim_sellers_scd2 ||--o{ fact_order_items : "seller_key (as-of)"

    dim_customers {
        bigint customer_key PK
        varchar customer_unique_id
        varchar customer_state
    }
    dim_date {
        int date_key PK
        date full_date
        varchar day_of_week
    }
    dim_products {
        bigint product_key PK
        varchar product_category_name_english
    }
    dim_sellers {
        bigint seller_key PK
        varchar seller_state
    }
    fact_orders {
        varchar order_id PK
        bigint customer_key FK
        int purchase_date_key FK
        int delivery_date_key FK
        decimal total_order_value
        boolean is_late
    }
    fact_order_items {
        varchar order_item_id PK
        varchar order_id FK
        bigint product_key FK
        bigint seller_key FK
        decimal price
    }
```

## Hands-On Walkthrough — verify this diagram against the real schema

1. In **SQL Editor**, list every Gold table's real columns and compare
   against the diagram above:
   ```sql
   SELECT table_name, column_name, data_type
   FROM iceberg.information_schema.columns
   WHERE table_schema = 'gold' ORDER BY table_name, ordinal_position;
   ```
2. **Expected result**: every column in the diagram exists in your real
   tables — if you've customized any dimension/fact table differently
   across modules 04-08, note the difference here (this diagram
   documents the reference build, not necessarily every variation you
   may have introduced during hands-on exercises).
3. Confirm the role-playing `dim_date` relationship concretely:
   ```sql
   SELECT count(*) FROM iceberg.gold.fact_orders f
   JOIN iceberg.gold.dim_date d1 ON f.purchase_date_key = d1.date_key
   LEFT JOIN iceberg.gold.dim_date d2 ON f.delivery_date_key = d2.date_key;
   ```
   **Expected result**: `99441` — both joins resolve correctly (the
   `LEFT JOIN` on `delivery_date_key` handles the legitimately-`NULL`
   undelivered orders).

> 🧪 **Checkpoint**: you verified the ER diagram's every column and
> relationship against your own real Gold-layer tables.

## Next document

[`03-metadata-and-catalog.md`](03-metadata-and-catalog.md).
