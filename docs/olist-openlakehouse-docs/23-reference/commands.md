# Commands Reference

**Content type: REFERENCE.** Every real command used across this
documentation set, grouped by tool, for quick copy-paste lookup.

## Docker Compose

```powershell
docker compose up -d --profile full          # start everything
docker compose ps                             # check service health
docker compose logs -f <service>              # tail real logs
docker compose exec <service> <cmd>           # run a command inside a container
docker compose restart <service>              # apply config changes
docker compose build <service>                # rebuild after a Dockerfile/code change
```

## Trino / SQL

```powershell
docker compose exec trino trino --execute "SHOW TABLES FROM iceberg.gold"
```
```sql
SELECT * FROM iceberg.information_schema.columns WHERE table_schema = 'gold';
SELECT * FROM iceberg.gold."fact_orders$files";
SELECT * FROM iceberg.gold."fact_orders$snapshots";
ALTER TABLE iceberg.gold.fact_orders EXECUTE optimize;
```

## dbt

```powershell
docker compose exec dbt dbt run --project-dir dbt_project --profiles-dir profiles
docker compose exec dbt dbt test --project-dir dbt_project --profiles-dir profiles
docker compose exec dbt dbt build --project-dir dbt_project --profiles-dir profiles
docker compose exec dbt dbt list --select +model_name+ --project-dir dbt_project --profiles-dir profiles
docker compose exec dbt dbt snapshot --project-dir dbt_project --profiles-dir profiles
```

## Spark

```powershell
docker compose exec spark-master spark-submit --master spark://spark-master:7077 --packages <coords> /opt/spark-apps/<script>.py
```

## Kafka

```powershell
docker compose exec kafka kafka-topics --bootstrap-server kafka:9092 --list
docker compose exec kafka kafka-console-consumer --bootstrap-server kafka:9092 --topic <topic> --from-beginning --max-messages 5
docker compose exec kafka kafka-consumer-groups --bootstrap-server kafka:9092 --describe --group <group>
```

## MLflow / training

```powershell
docker compose run --rm mlflow-train python train_late_delivery.py
```

## Gitea

```powershell
git remote add origin http://localhost:3002/<user>/<repo>.git
git push -u origin main
```

## Backend tests

```powershell
docker compose exec backend pytest -v
```

## Next reference document

[`configuration-reference.md`](configuration-reference.md).
