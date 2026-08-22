# 04 — Debezium CDC

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`infra/debezium/init-cdc-schema.sql`, `infra/debezium/postgres-connector.json`).**

## Real setup: a dedicated `cdc` schema with `REPLICA IDENTITY FULL`

**Verified from the init SQL**: `cdc.customers` and `cdc.orders` are
genuinely separate demo tables (not the Olist tables). Critically, both
have `ALTER TABLE ... REPLICA IDENTITY FULL` applied — **required**
because Debezium's `pgoutput` plugin needs the full "before" image to
reconstruct UPDATE/DELETE changes; the Postgres default
(`REPLICA IDENTITY DEFAULT`, primary-key-only) is insufficient for
UPDATE's before-image.

## Hands-On Walkthrough — set up and observe real CDC end-to-end

1. Apply the schema (one-time, since it's not in
   `docker-entrypoint-initdb.d`):
   ```powershell
   docker exec -i openlakehouse-postgres psql -U openlakehouse -d openlakehouse < infra/debezium/init-cdc-schema.sql
   ```
2. Register the connector: `bash infra/debezium/register-connector.sh` (or
   `curl` the same `postgres-connector.json` payload to Debezium Connect's
   REST API directly, per that script's real contents).
3. Insert a real row: `docker exec -i openlakehouse-postgres psql -U
   openlakehouse -d openlakehouse -c "INSERT INTO cdc.customers (name,
   email) VALUES ('Ana Silva', 'ana@example.com');"`
4. Confirm a real Debezium change event appears on the CDC topic:
   ```powershell
   docker compose exec kafka kafka-console-consumer --bootstrap-server kafka:9092 --topic openlakehouse.cdc.customers --from-beginning --max-messages 1
   ```
   **Expected result**: a real Debezium envelope JSON with `payload.op =
   "c"` (create), `payload.after` containing your inserted row's real
   values.
5. **Test the `REPLICA IDENTITY FULL` requirement directly**: update the
   row (`UPDATE cdc.customers SET email = 'ana2@example.com' WHERE name =
   'Ana Silva';`), re-consume the topic. **Expected result**:
   `payload.op = "u"`, and — because of `REPLICA IDENTITY FULL` —
   `payload.before` contains the **full previous row** (not just the
   primary key), genuinely provable by comparing `payload.before.email`
   (old value) against `payload.after.email` (new value) in the same
   message.

> 🧪 **Checkpoint**: you registered a real Debezium connector, and
> directly observed a real UPDATE event containing a full "before" image
> — concrete proof `REPLICA IDENTITY FULL` is doing its job.

## Next document

[`05-ordering-dedup-and-merge.md`](05-ordering-dedup-and-merge.md).
