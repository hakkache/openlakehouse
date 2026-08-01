import re

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, get_current_user
from app.core.trino_client import get_trino_connection
from app.schemas.catalog import ColumnInfo, TablePreview

router = APIRouter(prefix="/catalog", tags=["catalog"])

_IDENTIFIER_RE = re.compile(r"^[A-Za-z0-9_]+$")


def _validate_identifier(value: str, kind: str) -> str:
    if not _IDENTIFIER_RE.match(value):
        raise HTTPException(status_code=400, detail=f"Invalid {kind} name")
    return value


@router.get("/catalogs", response_model=list[str])
def list_catalogs(user: CurrentUser = Depends(get_current_user)) -> list[str]:
    conn = get_trino_connection(user.username)
    cur = conn.cursor()
    cur.execute("SHOW CATALOGS")
    return [row[0] for row in cur.fetchall()]


@router.get("/schemas", response_model=list[str])
def list_schemas(catalog: str, user: CurrentUser = Depends(get_current_user)) -> list[str]:
    catalog = _validate_identifier(catalog, "catalog")
    conn = get_trino_connection(user.username)
    cur = conn.cursor()
    cur.execute(f"SHOW SCHEMAS FROM {catalog}")
    return [row[0] for row in cur.fetchall()]


@router.get("/tables", response_model=list[str])
def list_tables(catalog: str, schema: str, user: CurrentUser = Depends(get_current_user)) -> list[str]:
    catalog = _validate_identifier(catalog, "catalog")
    schema = _validate_identifier(schema, "schema")
    conn = get_trino_connection(user.username)
    cur = conn.cursor()
    cur.execute(f"SHOW TABLES FROM {catalog}.{schema}")
    return [row[0] for row in cur.fetchall()]


@router.get("/columns", response_model=list[ColumnInfo])
def list_columns(
    catalog: str, schema: str, table: str, user: CurrentUser = Depends(get_current_user)
) -> list[ColumnInfo]:
    catalog = _validate_identifier(catalog, "catalog")
    schema = _validate_identifier(schema, "schema")
    table = _validate_identifier(table, "table")
    conn = get_trino_connection(user.username)
    cur = conn.cursor()
    cur.execute(f"DESCRIBE {catalog}.{schema}.{table}")
    return [ColumnInfo(name=row[0], type=row[1], extra=row[2] or None, comment=row[3] or None) for row in cur.fetchall()]


@router.get("/preview", response_model=TablePreview)
def preview_table(
    catalog: str,
    schema: str,
    table: str,
    limit: int = 50,
    user: CurrentUser = Depends(get_current_user),
) -> TablePreview:
    catalog = _validate_identifier(catalog, "catalog")
    schema = _validate_identifier(schema, "schema")
    table = _validate_identifier(table, "table")
    limit = max(1, min(limit, 200))
    conn = get_trino_connection(user.username)
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {catalog}.{schema}.{table} LIMIT {limit}")
    rows = cur.fetchall()
    columns = [desc[0] for desc in cur.description] if cur.description else []
    return TablePreview(columns=columns, rows=[list(r) for r in rows], row_count=len(rows))
