"""Publishes demo `orders` JSON events to the real Kafka broker.

Usage (from the host, with kafka-python installed, or inside any container on
the openlakehouse-net network):
    python produce_demo_orders.py --count 20 --bootstrap-servers localhost:9094

Run from inside a container attached to openlakehouse-net (e.g. backend), use
--bootstrap-servers kafka:9092 instead.
"""
import argparse
import json
import random
import uuid
from datetime import datetime, timezone

from kafka import KafkaProducer

STATUSES = ["PENDING", "PAID", "SHIPPED", "CANCELLED"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--bootstrap-servers", default="localhost:9094")
    parser.add_argument("--topic", default="orders")
    args = parser.parse_args()

    producer = KafkaProducer(
        bootstrap_servers=args.bootstrap_servers,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )

    for _ in range(args.count):
        event = {
            "order_id": str(uuid.uuid4()),
            "customer_id": f"cust-{random.randint(1, 50)}",
            "amount": round(random.uniform(5, 500), 2),
            "status": random.choice(STATUSES),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        producer.send(args.topic, event)

    producer.flush()
    producer.close()
    print(f"Sent {args.count} demo order events to topic '{args.topic}'")


if __name__ == "__main__":
    main()
