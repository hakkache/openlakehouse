from pyhive import hive

from app.core.config import get_settings


def get_spark_connection(user: str = "openlakehouse") -> hive.Connection:
    """Connect to the Spark Thrift Server (HiveServer2-compatible) for ad-hoc SQL.

    Auth is NOSASL: the thrift server is only reachable on the internal docker
    network and has no external port exposed, so no credentials are needed.
    """
    settings = get_settings()
    return hive.Connection(
        host=settings.spark_thrift_host,
        port=settings.spark_thrift_port,
        username=user or "openlakehouse",
        auth="NOSASL",
    )
