"""Runs ad-hoc PySpark code submitted from Data Explorer's "PySpark Code" mode.

Unlike the SQL editor (which sends SQL text to Trino or the Spark Thrift
Server), this executes real PySpark against a long-lived SparkSession owned
by the backend process itself, connected to the same standalone cluster and
Iceberg/Polaris warehouse. The session is created lazily on first use and
reused across requests to avoid paying Spark app/executor startup cost per
snippet.

This intentionally runs arbitrary user-submitted Python via exec() — it is
restricted to ADMIN/DATA_ENGINEER roles at the API layer (see
app/api/v1/spark_code.py) and is only appropriate for a trusted, internal
platform (the same trust level already implied by the platform's Jupyter
notebooks).

An idle-timeout background thread stops the session automatically after
`spark_code_idle_timeout_seconds` of no submissions, so the Spark application
doesn't hold cluster cores forever; it can also be stopped manually via
POST /api/v1/spark-code/session/stop.
"""

import contextlib
import io
import threading
import time

from pyspark.sql import SparkSession

from app.core.config import get_settings

_session: SparkSession | None = None
_session_lock = threading.Lock()
_last_used_monotonic: float | None = None
_idle_watcher_started = False


def _start_idle_watcher() -> None:
    """Background thread that stops the shared session after a period of inactivity.

    Without this, the Spark application created by the first PySpark Code run
    stays registered on the Master (holding spark.code.cores.max cores)
    forever, even when nobody is using it.
    """
    global _idle_watcher_started
    if _idle_watcher_started:
        return
    _idle_watcher_started = True

    def _watch() -> None:
        while True:
            time.sleep(60)
            timeout = get_settings().spark_code_idle_timeout_seconds
            with _session_lock:
                if _session is not None and _last_used_monotonic is not None:
                    if time.monotonic() - _last_used_monotonic > timeout:
                        _stop_session_locked()

    threading.Thread(target=_watch, daemon=True).start()


def _stop_session_locked() -> None:
    global _session, _last_used_monotonic
    if _session is not None:
        _session.stop()
        _session = None
        _last_used_monotonic = None


def get_or_create_spark_session() -> SparkSession:
    global _session, _last_used_monotonic
    with _session_lock:
        if _session is None:
            settings = get_settings()
            _session = (
                SparkSession.builder.appName("openlakehouse-explorer-pyspark")
                .master(settings.spark_master_spark_url)
                .config("spark.driver.host", settings.spark_code_driver_host)
                .config("spark.cores.max", settings.spark_code_cores_max)
                # The backend container has no /opt/spark/spark-events volume (unlike
                # spark-master/worker/thriftserver) - disable event logging for this
                # ad-hoc session rather than mounting a volume just for history-server UI.
                .config("spark.eventLog.enabled", "false")
                .getOrCreate()
            )
        _last_used_monotonic = time.monotonic()
        _start_idle_watcher()
        return _session


def stop_session() -> bool:
    """Manually stop the shared session (e.g. a "Stop Spark session" button). Returns
    True if a session was actually running and got stopped."""
    with _session_lock:
        was_running = _session is not None
        _stop_session_locked()
        return was_running


def session_status() -> dict:
    with _session_lock:
        if _session is None or _last_used_monotonic is None:
            return {"running": False, "idle_seconds": None, "idle_timeout_seconds": get_settings().spark_code_idle_timeout_seconds}
        return {
            "running": True,
            "idle_seconds": int(time.monotonic() - _last_used_monotonic),
            "idle_timeout_seconds": get_settings().spark_code_idle_timeout_seconds,
        }


def run_code(code: str, job_group: str, extra_globals: dict[str, object] | None = None) -> str:
    """Execute user-submitted PySpark code, returning captured stdout/stderr.

    The submitted code runs with a `spark` (SparkSession) and `sc`
    (SparkContext) variable pre-bound, mirroring a notebook cell.
    `extra_globals` (e.g. a pipeline's `variables` dict, passed by reference so
    in-code mutations are visible to later pipeline nodes) is merged in on top.
    """
    spark = get_or_create_spark_session()
    spark.sparkContext.setJobGroup(job_group, "Data Explorer ad-hoc PySpark code")
    buffer = io.StringIO()
    namespace: dict[str, object] = {"spark": spark, "sc": spark.sparkContext}
    if extra_globals:
        namespace.update(extra_globals)
    try:
        with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(buffer):
            exec(compile(code, "<data-explorer-pyspark>", "exec"), namespace)  # noqa: S102
    finally:
        spark.sparkContext.setJobGroup("", "")
    return buffer.getvalue()


def cancel_job_group(job_group: str) -> None:
    if _session is not None:
        _session.sparkContext.cancelJobGroup(job_group)
