"""Real Kafka introspection helpers backing the Streaming status API.

Uses `kafka-python`'s admin/consumer clients directly against the broker - no
mocked/simulated data. Designed to be cheap enough to call on every page load
of the Streaming dashboard (short timeouts, small requests).
"""

from __future__ import annotations

from kafka import KafkaAdminClient, KafkaConsumer, TopicPartition
from kafka.errors import KafkaError

from app.core.config import get_settings


def _bootstrap_servers() -> str:
    return get_settings().kafka_bootstrap_servers


def list_topic_status(consumer_group: str = "openlakehouse-streaming") -> list[dict]:
    """Return per-topic partition/offset/lag status for every non-internal topic."""
    servers = _bootstrap_servers()
    admin = KafkaAdminClient(bootstrap_servers=servers, client_id="openlakehouse-backend", request_timeout_ms=5000)
    try:
        topics = sorted(t for t in admin.list_topics() if not t.startswith("__"))
    finally:
        admin.close()

    if not topics:
        return []

    consumer = KafkaConsumer(
        bootstrap_servers=servers,
        group_id=consumer_group,
        enable_auto_commit=False,
        consumer_timeout_ms=5000,
    )
    try:
        results = []
        for topic in topics:
            partitions = consumer.partitions_for_topic(topic) or set()
            tps = [TopicPartition(topic, p) for p in partitions]
            end_offsets = consumer.end_offsets(tps) if tps else {}
            beginning_offsets = consumer.beginning_offsets(tps) if tps else {}
            committed = {tp: (consumer.committed(tp) or 0) for tp in tps}

            total_messages = sum(end_offsets.get(tp, 0) - beginning_offsets.get(tp, 0) for tp in tps)
            total_lag = sum(max(end_offsets.get(tp, 0) - committed.get(tp, 0), 0) for tp in tps)

            results.append(
                {
                    "topic": topic,
                    "partitions": len(partitions),
                    "messages": total_messages,
                    "lag": total_lag,
                    "status": "ACTIVE" if partitions else "UNKNOWN",
                }
            )
        return results
    finally:
        consumer.close()


def is_kafka_available() -> bool:
    try:
        admin = KafkaAdminClient(bootstrap_servers=_bootstrap_servers(), request_timeout_ms=3000)
        admin.close()
        return True
    except KafkaError:
        return False
