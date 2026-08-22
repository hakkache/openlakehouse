# 02 — Compute

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`backend/app/core/compute_client.py`).**

## Real behavior: live REST calls to Spark master's own JSON UI, returning `None` on failure

**Verified**: `get_spark_status()` calls Spark master's real
`/json/` endpoint directly — worker counts, cores used/total, memory
used/total, active/completed app counts are all genuine live cluster
state, not derived/cached values.

## Hands-On Walkthrough — watch real compute state change live

1. Open `http://localhost/compute`. **Expected result**: real worker
   count (`workers_alive`/`workers_total`), likely matching your
   `docker-compose.yml`'s configured Spark worker replica count.
2. Note the current `active_apps` count (likely `0` if idle).
3. Start a real Spark job — run the training script from
   [`13-machine-learning/03-model-training-and-evaluation.md`](../13-machine-learning/03-model-training-and-evaluation.md)
   or the streaming job from
   [`14-streaming-and-cdc/03-spark-structured-streaming.md`](../14-streaming-and-cdc/03-spark-structured-streaming.md).
4. While it's running, refresh `/compute`. **Expected result**:
   `active_apps` increases by 1, `cores_used`/`memory_used_mb` increase —
   real, live cluster utilization reflecting your actual running job.
5. After the job finishes, refresh again. **Expected result**:
   `active_apps` returns to its prior value, `completed_apps` increases
   by 1 — the exact real lifecycle of a Spark application, observed live.
6. Test the "unreachable" case honestly: `docker compose stop
   spark-master`, refresh `/compute`. **Expected result**: the page
   reflects unreachable state (per `compute_client.py`'s documented
   `None`-on-failure behavior), not a stale/cached value. Restart it
   afterward: `docker compose start spark-master`.

> 🧪 **Checkpoint**: you watched a real Spark job's lifecycle
> (active → completed) reflected live on the Compute page, and confirmed
> the page honestly reports "unreachable" when the master is genuinely
> stopped.

## Next document

[`03-capacity-and-cost.md`](03-capacity-and-cost.md).
