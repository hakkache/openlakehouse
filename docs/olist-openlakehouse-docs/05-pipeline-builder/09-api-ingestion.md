# 09 — API Ingestion Nodes

**Content type: CURRENT PLATFORM CAPABILITY (verified) + PROJECT IMPLEMENTATION.**

## What it really does

`api_ingestion` nodes (`rest_get`/`rest_post`) make a genuine outbound
HTTP call via `httpx` and store the parsed JSON response into a variable
— this is real network I/O from inside a pipeline run, not a mock.

## Hands-On Walkthrough — pull real exchange-rate data (BRL context)

Since Olist prices are in Brazilian Real (BRL), a realistic use of
`api_ingestion` is enriching this project with a real current exchange
rate from a public API.

1. Create pipeline `api_ingestion_demo`.
2. Add an **api_ingestion** node, `type = rest_get`,
   `url = https://api.exchangerate-api.com/v4/latest/BRL`,
   `result_variable = fx_response`.
3. Run. Check the run detail page's variables state. **Expected result**:
   `fx_response` contains a real parsed JSON object with a `rates` key
   (e.g. `rates.USD` around `0.18-0.20` depending on the day) — a genuine
   external API response, timestamped to when you ran it.
4. Add a **code** node, `type = python`:
   ```python
   variables["brl_to_usd"] = variables["fx_response"]["rates"]["USD"]
   ```
5. Re-run. **Expected result**: `brl_to_usd` is a real float you could now
   feed into a `derived_column` transform node elsewhere in the pipeline
   (e.g. `price * {{brl_to_usd}}` to add a USD-equivalent revenue column
   to a Gold table) — demonstrating a full real external-data enrichment
   flow, not a canned example.

## Operational caution

An `api_ingestion` node depending on a third-party API introduces a real
external failure mode (the API being down, rate-limited, or its schema
changing) into your pipeline — this is exactly the kind of dependency
[`08-advanced-data-engineering/`](../08-advanced-data-engineering/) and
[`21-production-scenarios/`](../21-production-scenarios/) cover for
production hardening (timeouts, retries, fallback values).

> 🧪 **Checkpoint**: you fetched real live data from a public API inside a
> pipeline run and used it in a downstream calculation, with no fabricated
> data anywhere in the flow.

## Next document

[`10-sub-pipelines.md`](10-sub-pipelines.md).
