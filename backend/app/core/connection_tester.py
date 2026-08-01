"""Real connection-test logic for every supported Connection Management type.

Every function actually attempts to reach the target system with the given
config/credentials and returns a `(success, message, latency_ms)` tuple - no
simulated/fake results, per the spec's "the test must be real" requirement.
"""

from __future__ import annotations

import time
from typing import Any


def _timed(fn) -> tuple[bool, str, int]:
    start = time.monotonic()
    try:
        message = fn()
        latency_ms = int((time.monotonic() - start) * 1000)
        return True, message or "Connected successfully", latency_ms
    except Exception as exc:  # noqa: BLE001 - we want to surface any real connector error
        latency_ms = int((time.monotonic() - start) * 1000)
        return False, f"{type(exc).__name__}: {exc}", latency_ms


def test_postgresql(config: dict[str, Any], password: str | None) -> tuple[bool, str, int]:
    import psycopg

    def _run() -> str:
        with psycopg.connect(
            host=config["host"],
            port=int(config.get("port", 5432)),
            dbname=config.get("database", "postgres"),
            user=config["username"],
            password=password or "",
            connect_timeout=5,
        ) as conn:
            conn.execute("SELECT 1")
        return "PostgreSQL SELECT 1 succeeded"

    return _timed(_run)


def test_mysql(config: dict[str, Any], password: str | None) -> tuple[bool, str, int]:
    import pymysql

    def _run() -> str:
        conn = pymysql.connect(
            host=config["host"],
            port=int(config.get("port", 3306)),
            user=config["username"],
            password=password or "",
            database=config.get("database") or None,
            connect_timeout=5,
        )
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        finally:
            conn.close()
        return "MySQL SELECT 1 succeeded"

    return _timed(_run)


def test_sqlserver(config: dict[str, Any], password: str | None) -> tuple[bool, str, int]:
    import pytds

    def _run() -> str:
        conn = pytds.connect(
            server=config["host"],
            port=int(config.get("port", 1433)),
            user=config["username"],
            password=password or "",
            database=config.get("database") or None,
            timeout=5,
            login_timeout=5,
        )
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        finally:
            conn.close()
        return "SQL Server SELECT 1 succeeded"

    return _timed(_run)


def test_rest(config: dict[str, Any], password: str | None) -> tuple[bool, str, int]:
    import httpx

    def _run() -> str:
        auth = (config["username"], password) if config.get("username") else None
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(config["url"], auth=auth)
        if resp.status_code >= 500:
            raise RuntimeError(f"Server error: HTTP {resp.status_code}")
        return f"REST endpoint responded HTTP {resp.status_code}"

    return _timed(_run)


def test_kafka(config: dict[str, Any], password: str | None) -> tuple[bool, str, int]:
    from kafka import KafkaAdminClient

    def _run() -> str:
        admin = KafkaAdminClient(
            bootstrap_servers=config["bootstrap_servers"],
            client_id="openlakehouse-connection-test",
            request_timeout_ms=5000,
        )
        try:
            topics = admin.list_topics()
        finally:
            admin.close()
        return f"Connected - {len(topics)} topic(s) visible"

    return _timed(_run)


def test_minio(config: dict[str, Any], password: str | None) -> tuple[bool, str, int]:
    from minio import Minio

    def _run() -> str:
        client = Minio(
            config["endpoint"],
            access_key=config["username"],
            secret_key=password or "",
            secure=bool(config.get("secure", False)),
        )
        buckets = client.list_buckets()
        return f"Connected - {len(buckets)} bucket(s) visible"

    return _timed(_run)


def test_trino(config: dict[str, Any], password: str | None) -> tuple[bool, str, int]:
    import trino.dbapi

    def _run() -> str:
        conn = trino.dbapi.connect(
            host=config["host"],
            port=int(config.get("port", 8080)),
            user=config.get("username") or "openlakehouse",
            catalog=config.get("catalog", "system"),
        )
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchall()
        return "Trino SELECT 1 succeeded"

    return _timed(_run)


TESTERS = {
    "postgresql": test_postgresql,
    "mysql": test_mysql,
    "sqlserver": test_sqlserver,
    "rest": test_rest,
    "kafka": test_kafka,
    "minio": test_minio,
    "trino": test_trino,
}


def run_connection_test(conn_type: str, config: dict[str, Any], password: str | None) -> tuple[bool, str, int]:
    tester = TESTERS.get(conn_type)
    if tester is None:
        return False, f"Unsupported connection type: {conn_type}", 0
    return tester(config, password)
