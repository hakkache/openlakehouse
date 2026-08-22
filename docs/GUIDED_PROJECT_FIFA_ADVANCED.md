# Follow-Along: OpenLakehouse Advanced Edition (FIFA World Cup 2026 + the Advanced Pipeline Engine)

This is a **second, standalone** end-to-end tutorial that complements
[`GUIDED_PROJECT_FIFA.md`](GUIDED_PROJECT_FIFA.md). It follows the same
54,600-row FIFA World Cup 2026 dataset and rebuilds the same core lakehouse
(Bronze → Silver → Gold, quality gates, lineage, orchestration, dashboards,
ML, monitoring), but goes one step further: it gives the platform's newest
capability — the **advanced pipeline execution engine** (5 new no-code node
kinds that run step-by-step instead of compiling to one SQL statement) — a
full, hands-on, first-class section instead of a one-paragraph mention, plus
dedicated hands-on treatment of the **ER Diagram** page, the **Spark Code
session controls**, and the newer builder UX (drag-and-drop node placement,
collapsible palette categories, collapsible sidebar).

**Everything below (variable/code/control/api_ingestion/sub_pipeline nodes,
the ER Diagram page, node "Copy ID" panel, Fit View, edge-drawing) was
hands-on verified in a real logged-in browser session while writing this
guide** — not just checked against the backend code — so every screenshot
description, field name, and expected result reflects real, observed
behavior.

If you've already done the original guide, you can skip straight to
**Part 2 — the Advanced Pipeline Engine**. If this is your first time in
OpenLakehouse, start at Part 1 and work straight through.

## 0. Prerequisites

Start (or confirm) the full stack is up:

```powershell
docker compose --profile full up -d --build
docker compose ps
```

Wait until everything shows `Up`/`healthy` (`redis-exporter` showing
"unhealthy" is a known cosmetic bug in that image's own baked-in healthcheck
— ignore it).

**Access points and credentials:**

| Service | URL | Login |
|---|---|---|
| OpenLakehouse app | http://localhost | `admin.user` / `openlakehouse` (`ADMIN`), or `engineer.user` / `openlakehouse` (`DATA_ENGINEER`) |
| Jupyter | http://localhost:8888/jupyter/?token=openlakehouse | token: `openlakehouse` |
| Apache Superset | http://localhost:8088 | `admin` / `openlakehouse_dev_password` |
| MLflow | http://localhost:5000 | no auth |
| Dagster | http://localhost:3001 | no auth |
| Gitea | http://localhost:3010 | `olh-admin` / `openlakehouse_dev_password` |
| Grafana | http://localhost:3300 | `admin` / `openlakehouse_dev_password` |
| Trino UI | http://localhost:8082 | no auth |

> Always browse the app via **http://localhost** (port 80, through Traefik)
> — the frontend's own dev port doesn't proxy `/api` and POSTs will fail
> with 405.

> **Role note:** `python`/`pyspark` **code** nodes and the whole advanced
> pipeline engine's **Run** action require the caller to hold `ADMIN` or
> `DATA_ENGINEER` (checked server-side by `requires_elevated_role()` in
> `backend/app/api/v1/pipelines.py` before a run is even created) — log in
> as `admin.user` or `engineer.user`, not a `VIEWER`/`ANALYST` account, for
> Part 2.

---

## Part 1 — The core lakehouse tour (condensed)

This part rebuilds the same foundation as the original guide — do this
first if you haven't already. Full step-by-step detail (exact config JSON
for all 11 core pipelines, all 15 Superset charts, both MLflow models, CDC
walkthrough, etc.) lives in
[`GUIDED_PROJECT_FIFA.md`](GUIDED_PROJECT_FIFA.md) §1–§16 — follow those
sections verbatim, then come back here for Part 2. In short, you will:

1. **Load the dataset** — `docs/guided_project/fifa_world_cup_2026_player_performance.csv`
   into `iceberg.bronze.fifa_player_matches` via a Jupyter/PySpark cell.
2. **Explore it with SQL and PySpark** — the SQL page (Trino) and a
   PySpark Code cell against a live shared `SparkSession`, plus catalog
   tree right-click actions (preview, copy SELECT, row count).
3. **Build the classic Bronze → Silver pipeline** with quality gates
   (`not_null`/`unique`/`range`) ahead of `filter`/`derived_column`.
4. **Build 10 Gold pipelines** exercising every transform/quality/
   destination type the compiler supports.
5. **Check Data Quality, Lineage, and the ER Diagram** (ER Diagram gets a
   dedicated hands-on walkthrough in §7 below since it's new).
6. **Orchestrate with Dagster** via the Jobs page, and **schedule** a
   pipeline.
7. **Build the 15-chart, 4-tab Superset dashboard** with native filters.
8. **Train two MLflow models**, version the work in **Gitea**, monitor it
   in **Grafana/Prometheus/Loki**, try **streaming + CDC**, manage
   **Connections**, check **Compute**, ask the **AI Assistant**, and review
   **Platform Health/RBAC/Admin**.

Once all 11 pipelines exist and you're comfortable with the builder's
basic source/transform/quality/destination nodes, continue below.

---

## Part 2 — The Advanced Pipeline Execution Engine

### Why this exists

Every node kind in Part 1 (`source`, `transform`, `quality`, `destination`)
compiles the *whole* pipeline into a single `CREATE TABLE ... AS SELECT`
statement and runs it as one Trino query. That's fast and simple, but it
can't express things like "compute a value now and reuse it three steps
later", "call an external API", "run arbitrary Python", or "branch/loop".

Five more node kinds solve that. Any pipeline that contains **at least one**
of them switches to a different, **step-by-step engine**
(`backend/app/core/pipeline_executor.py`) instead of the single-statement
compiler — each node runs in turn, sharing one `variables` dictionary, and
each node's own real status/row-count/message is tracked and shown on the
canvas individually:

| Kind | Types | What it does |
|---|---|---|
| `variable` | `literal`, `from_query` | Sets a variable to a fixed value, or to the first cell of a SQL query's result |
| `code` | `sql`, `python`, `pyspark` | Runs a SQL statement (optionally storing its first result cell into a variable), or arbitrary Python/PySpark code with the shared `variables` dict available |
| `control` | `if`, `for_each` | Conditionally skips a list of node ids, or re-runs a list of "body" node ids once per item in a list variable |
| `api_ingestion` | `rest_get`, `rest_post` | Calls a real external URL and stores the JSON response into a variable |
| `sub_pipeline` | `call` | Runs another one of your saved pipelines inline, by its ID |

All five appear in the **No-Code Builder** (`/pipelines`) palette under
their own collapsible groups, below the classic `source`/`transform`/
`quality`/`destination` groups. **Compile** (dry-run SQL preview) is
disabled for these pipelines — since there's no single SQL statement to
preview — and you'll instead see a friendly error telling you to use
**Run** directly.

### 2.1 Build a "player-appearance threshold" pipeline (variable + code + api_ingestion)

This walks through the exact pipeline that was built and run live while
writing this guide — every result below is real, not illustrative.

1. Open **Pipelines** (`/pipelines`), log in if prompted, click **New**.
2. In the palette's **variable** group, click **literal** to drop a node
   onto the canvas. Click it to open its config panel on the right — note
   it shows the node's real id (e.g. `variable_..._1`) with a **Copy ID**
   button; you'll need node ids like this for `control`/`sub_pipeline`
   config later. Fill in:
   - **Variable name**: `min_minutes`
   - **Value (supports `{{other_var}}`)**: `1`
3. In the **code** group, click **sql** to drop a second node. Click it and
   fill in:
   - **SQL query (supports `{{var}}`)**:
     ```sql
     SELECT COUNT(*) FROM iceberg.bronze.fifa_player_matches WHERE minutes_played >= {{min_minutes}}
     ```
   - **Store first result cell into variable**: `appearance_count`
4. Both nodes probably landed on top of each other or off in a corner —
   click **Fit View** in the canvas's bottom-left control panel to bring
   them into view.
5. Draw an edge from the `literal` node's right-hand connector to the `sql`
   node's left-hand connector (this is cosmetic bookkeeping for the
   step-by-step engine — variables are pipeline-wide, not passed along
   edges — but it keeps the canvas readable and is good practice).
6. **Save**, then **Run**.

**Real result observed:** the toolbar shows overall pipeline status
**SUCCESS**, both nodes get a green **✓** on the canvas, and clicking the
`sql` node's config panel shows:

```
Status: SUCCESS
Row count: 1
Message: Query executed
```

The `{{min_minutes}}` template was correctly substituted with `1` before
the query ran against the real, live Trino cluster.

### 2.2 Add a real external API call (`api_ingestion` / `rest_get`)

Still on the same pipeline:

1. In the **api_ingestion** group, click **rest_get** to add a third node.
   Fit View again if it's off-canvas.
2. Click it and fill in:
   - **URL (supports `{{var}}`)**: `https://api.github.com/repos/apache/iceberg`
   - **Store JSON response into variable**: `iceberg_repo_info`
3. **Save**, then **Run** again.

**Real result observed:** all three nodes now show **✓**, overall status
**SUCCESS**, and the `rest_get` node's panel shows:

```
Status: SUCCESS
Message: Stored response in variable 'iceberg_repo_info'
```

This is a genuine outbound HTTPS call from the backend container to a
public API — confirmed separately that the backend has real internet
egress (`httpx.get(...)` against the same URL returns `200` with the real
JSON body). Feel free to swap in any public JSON API you like here, or your
own internal service.

### 2.3 `control` nodes — `if` and `for_each`

Both control types work by referencing **other nodes' ids** (the same ids
you can copy from each node's config panel via **Copy ID**). This section
is fully live-verified end-to-end in the browser.

> **Important gotcha before you start**: do **not** draw an edge between
> a `variable`/`code`/`control`/`api_ingestion`/`sub_pipeline` node and
> another one of these "advanced" kinds. Unlike `source`→`transform`→
> `destination` chains, these nodes communicate purely through a shared
> `variables` dict, not through the edge/view-aliasing mechanism — an edge
> here does nothing useful, and can actually **change execution order**
> (the engine topologically sorts nodes by edges; a node with an incoming
> edge runs *after* every edge-free node, even if you added it earlier on
> the canvas). Only wire edges between `source`/`transform`/`quality`/
> `destination` nodes.

**`for_each`** config:
- `List variable to iterate` — the name of a variable holding a real
  Python **list** (not a string). A `variable`/`literal` node can **never**
  produce a list — its value is always rendered as a plain string, even if
  you type something that looks like JSON. Use `variable`/`from_query`
  instead with a query whose first column is a Trino `ARRAY`, e.g.
  `SELECT ARRAY['Spain', 'France', 'Argentina']` — Trino's Python client
  decodes `ARRAY` columns as real Python lists, so this is the one
  reliable way to get list data into the engine.
- `Loop item variable name` — what the current item is called inside the
  loop body's `{{...}}` templates (default `item`).
- `Body node ids (run per iteration)` — a comma-separated list of node ids
  to re-run once per item. These nodes are automatically excluded from the
  pipeline's normal top-level run (they only ever run inside the loop).

**`if`** config:
- `Condition (Python expr over variables)` — a restricted `eval()` over
  your current variables (no builtins/functions available — only variable
  names, literals, comparisons, and operators), e.g.
  `appearance_count < 25000`.
- `Node ids to skip when TRUE` — comma-separated node ids to skip **only
  when the condition evaluates to `True`**.
- `Node ids to skip when FALSE` — comma-separated node ids to skip **only
  when the condition evaluates to `False`**.

**Live-verified walkthrough** (continuing the pipeline from §2.1–2.2, which
already has `min_minutes` → `appearance_count` and `iceberg_repo_info`):

1. Add a **`variable`/`from_query`** node, name it `teams_json`, query
   `SELECT ARRAY['Spain', 'France', 'Argentina']`.
2. Add a **`code`/`sql`** node (this is the loop body) with query
   `SELECT COUNT(*) FROM iceberg.bronze.fifa_player_matches WHERE team = '{{team}}'`,
   result variable `team_appearance_count`. Copy its node id (e.g.
   `code_1785718537955_2`).
3. Add a **`control`/`for_each`** node: `List variable to iterate` =
   `teams_json`, `Loop item variable name` = `team`, `Body node ids` =
   the id you copied in step 2.
4. Add one more **`code`/`sql`** node as an `if`-branch target, e.g.
   `SELECT 'high_appearance_flag'`, result variable
   `high_appearance_flag`. Copy its id too.
5. Add a **`control`/`if`** node: `Condition` =
   `appearance_count < 25000`, `Node ids to skip when TRUE` = the id from
   step 4, `Node ids to skip when FALSE` = *(leave empty)*.
6. **Save**, then **Run**.

Real observed results from this exact setup: the `for_each` node's detail
panel showed **Status: SUCCESS**, **Message: "Iterated 3 item(s) over
'teams_json'"** (one pass per team, each re-running the body `sql` node
with `team` correctly templated in). The `if` node showed **Status:
SUCCESS**, **Message: "Condition evaluated to False"** (since
`appearance_count` was ≥ 25000 in the FIFA dataset) — and because the
condition was false, only `false_skip_nodes` (left empty) applied, so the
step-4 `sql` node correctly **ran** (not skipped), confirming the UI's
"skip when TRUE"/"skip when FALSE" labels now match the engine's actual
behavior exactly.

### 2.4 `sub_pipeline` — calling another saved pipeline

Add a `sub_pipeline`/`call` node, open its config, and set `Pipeline to
call (ID)` to another pipeline's real UUID and `Share variables with
sub-pipeline` to `true` or `false`. The builder UI has no dropdown for
this — it's a plain text field — so you need the target pipeline's UUID
from somewhere else. The most reliable way: ask an admin to look it up
directly in Postgres —
`docker compose exec postgres psql -U openlakehouse -d openlakehouse -c "select id, name from pipelines where name='<pipeline_name>';"`
— since the frontend doesn't surface other pipelines' ids anywhere.

Running the outer pipeline then runs the referenced pipeline inline (same
Trino session, same pipeline run), sharing the same `variables` dict when
`pass_variables` is true — a way to compose smaller pipelines into a
bigger orchestrated one without Dagster. A cycle-detection guard prevents
a pipeline from (in)directly calling itself.

**Live-verified**: added a `sub_pipeline`/`call` node pointing at the
saved `fifa_bronze_to_silver_appearances` pipeline's UUID with
`pass_variables: true`, saved, and ran the whole 9-node pipeline
(`variable`/`literal` → `code`/`sql` → `api_ingestion`/`rest_get` →
`variable`/`from_query` → `code`/`sql` loop body → `control`/`for_each` →
`control`/`if` → `code`/`sql` if-target → `sub_pipeline`/`call`) together.
Real observed result: **every node showed SUCCESS**, and the `call` node's
detail panel showed **Message: "Sub-pipeline 'fifa_bronze_to_silver_appearances'
SUCCEEDED"** — confirming the sub-pipeline actually executed inline as
part of the same run (not just validated/skipped).

### 2.5 `python`/`pyspark` code nodes and RBAC

Add a **code** / `python` or `pyspark` node the same way. These run
arbitrary code with the shared `variables` dict bound by reference (so a
`pyspark` node can read a variable set upstream, run a real Spark job, and
write a new variable back for a downstream node to use). Two things to
know:

- **Running** one of these (or any pipeline containing one) requires the
  logged-in user to hold `ADMIN` or `DATA_ENGINEER` — try it logged in as a
  `VIEWER`/`ANALYST` account and you'll get a 403 with a clear message,
  confirmed server-side before the run is even created (not just a
  disabled button).
- `pyspark` nodes share the same underlying Spark session infrastructure as
  the PySpark Code mode in Part 1 §3.2 — check **Compute** → the Spark
  applications table, or the Spark Master UI, to see the real job while it
  runs.

### 2.6 Builder UX details worth knowing

- **Drag-and-drop placement**: every palette button is draggable — drop it
  anywhere on the canvas to place the node at that exact spot, instead of
  clicking (which places it at a semi-random default position, sometimes
  behind the minimap/controls — click **Fit View** to recover it).
- **Collapsible palette categories**: click a group name (`variable`,
  `code`, `control`, etc.) to fold/unfold it — handy once you're only using
  a couple of the newer kinds and want more room for the ones you use
  every pipeline.
- **Collapsible sidebar**: the whole left nav has a **Collapse** button at
  its bottom — useful when you want more canvas width for a wide pipeline.
- **Node id + Copy ID**: every node's config panel header shows its real
  id and a one-click **Copy ID** button — this is what you paste into
  `if`/`for_each`/`sub_pipeline` config fields that reference other nodes
  or pipelines by id.

---

## Part 3 — ER Diagram, Monitoring summary, and Spark session control (hands-on)

These three Part-25-era features are fully clickable but easy to miss in a
quick tour — worth a dedicated pass.

### 3.1 ER Diagram

Open **ER Diagram** (`/er-diagram`) — a new nav entry between **Lineage**
and **Data Quality**. Pick catalog `iceberg`, schema `gold` (after
completing Part 1's 10 gold pipelines), and you'll see every gold table
rendered as a card listing its columns, with best-effort inferred
relationship arrows between tables whose columns look like foreign keys
(e.g. an `_id`-suffixed column matched against a same-named id column in
another table). Iceberg/Trino don't store real foreign-key metadata, so
treat the inferred arrows as a helpful starting point, not ground truth —
this is clearly a heuristic, not a schema-declared constraint.

### 3.2 Monitoring health summary

Open **Monitoring** (`/monitoring`). Above the raw Prometheus targets
table, you'll now see an overall health rollup: a health percentage plus
up/down target counts, and the same targets re-grouped by service instead
of one flat list — a faster "is everything actually up" glance than
scanning the full target table before you dig into Grafana/Prometheus/Loki
for the deeper dashboards described in Part 1 §12.

### 3.3 Spark Code session status/stop

Back in a **PySpark Code** cell (Part 1 §3.2), the session that backs your
running code now has explicit lifecycle controls: check its live status
and stop it on demand (`GET`/`POST` under `/api/v1/spark-code/session/...`
in the backend, both audit-logged) instead of only waiting for the
15-minute idle timeout to reclaim it. Handy when you've started a long
`pyspark` cell (or `pyspark` **code** node, §2.5) by mistake and want to
free the Spark executor immediately rather than waiting it out.

---

## Feature checklist — advanced edition

- [ ] Rebuilt the core lakehouse per Part 1 (or already had it from the original guide)
- [ ] Added a `variable`/`literal` node and referenced it via `{{var}}` templating in a `code`/`sql` node (§2.1)
- [ ] Ran a `code`/`sql` node and confirmed its real `Row count`/`Message` in the node's config panel (§2.1)
- [ ] Added an `api_ingestion`/`rest_get` node calling a real public API and stored its response into a variable (§2.2)
- [ ] Read (and optionally tried) `control`/`if` and `control`/`for_each` node config (§2.3)
- [ ] Read (and optionally tried) a `sub_pipeline`/`call` node referencing another saved pipeline by id (§2.4)
- [ ] Confirmed `python`/`pyspark` code nodes correctly 403 for non-`ADMIN`/`DATA_ENGINEER` accounts (§2.5)
- [ ] Used drag-and-drop node placement, a collapsed palette category, and the collapsible sidebar (§2.6)
- [ ] Copied a node's id via its config panel's **Copy ID** button (§2.6)
- [ ] Opened **ER Diagram**, picked a catalog/schema, and reviewed the inferred relationships (§3.1)
- [ ] Reviewed the **Monitoring** page's health summary card and per-service grouping (§3.2)
- [ ] Checked (or stopped) a Spark Code session via the new session status/stop control (§3.3)
