# 10 — API Ingestion

**Content type: CURRENT PLATFORM CAPABILITY, verified from the
`api_ingestion`-kind branch in `pipeline_executor.py`.**

## Config reference

| Config key | Required | Notes |
|---|---|---|
| `url` | yes | passed through `_render_template` first — can embed `{{ variables }}` |
| `headers` | no | dict, passed as real HTTP headers |
| `json_body` | no | used as the request's JSON body (only meaningful for `rest_post`) |
| `result_variable` | no (defaults to the node's own `id`) | where the parsed response is stored |

Real request behavior: a genuine `httpx.Client(timeout=30.0)` call,
`response.raise_for_status()` (a non-2xx response raises immediately —
real fail-fast), response parsed as JSON if possible, else stored as raw
text.

## Scenario 1 (Simple) — `rest_get`, a real public endpoint

1. Pipeline `api_demo`: an `api_ingestion` node,
   `type="rest_get"`, `url="https://api.frankfurter.app/latest?from=USD&to=BRL"`
   (or any real public JSON API you have access to — a currency-rate
   endpoint is a realistic "enrich Olist's BRL prices with a live FX
   rate" scenario), `result_variable="fx_data"`.
2. Add a `code:sql` node downstream using
   `{{ fx_data }}` in a `SELECT '{{ fx_data }}' AS raw_response` —
   confirming the real live JSON response is available.
3. Run. **Expected result**: a real network call happens (visible in the
   node's logged duration — should be noticeably non-zero, proving it's
   not mocked), and the response reflects the actual current rate.

## Scenario 2 (Medium) — templated URL using an upstream variable

4. Add a `variable(literal, name="currency_pair", value="EUR")` before
   the API node, change `url` to
   `"https://api.frankfurter.app/latest?from={{ currency_pair }}&to=BRL"`.
   **Expected result**: confirm (via the logged request or response)
   that the real substituted currency was used, not a hardcoded one —
   change `currency_pair` and re-run to prove it.

## Scenario 3 (Medium→Complex) — a real failure via `raise_for_status()`

5. Point `url` at a deliberately broken/nonexistent path on a real host
   (e.g. append `/this-does-not-exist` to a real API's base URL).
   **Expected result**: a real `HTTPStatusError` (404) — the pipeline
   fails at this node, all downstream nodes show `SKIPPED` (module 08's
   fail-fast rule), and the error message includes the real status code.

## Scenario 4 (Complex) — `rest_post`, sending a real JSON body

6. If you have access to any real POST-accepting test endpoint (e.g.
   `https://httpbin.org/post` for demonstration), add an `api_ingestion`
   node, `type="rest_post"`, `url="https://httpbin.org/post"`,
   `json_body={"order_count": "{{ order_count }}"}` (templated from an
   earlier `from_query` variable). **Expected result**: the echoed
   response (httpbin echoes back what it received) shows your real,
   templated value — proving the request body was genuinely built from
   live pipeline data, not a static payload.

## Real design implication

Because this is a genuine, blocking, synchronous HTTP call inside pipeline
execution, a slow or flaky external API directly extends your pipeline's
run time and failure surface — there's no built-in retry/backoff at this
node level (verify by checking whether a single failed call is retried
automatically — per the source, it is not). If you need retries, wrap the
call in your own `code:python` node using a retry loop instead.

> 🧪 **Checkpoint**: made a real live GET call with a templated URL,
> reproduced a real `HTTPStatusError` failure, and (if available) sent a
> real templated POST body to an echo endpoint.

## Next document

[`11-sub-pipelines.md`](11-sub-pipelines.md).
