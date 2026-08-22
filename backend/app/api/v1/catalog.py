import re

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, get_current_user
from app.core.trino_client import get_trino_connection
from app.schemas.catalog import ColumnInfo, ERColumn, ERDiagram, ERRelationship, ERTable, TablePreview

router = APIRouter(prefix="/catalog", tags=["catalog"])

_IDENTIFIER_RE = re.compile(r"^[A-Za-z0-9_]+$")
_FK_COLUMN_RE = re.compile(r"^(.+)_id$", re.IGNORECASE)


def _validate_identifier(value: str, kind: str) -> str:
    if not _IDENTIFIER_RE.match(value):
        raise HTTPException(status_code=400, detail=f"Invalid {kind} name")
    return value


def _entity_table_candidates(entity: str) -> set[str]:
    """Naive English pluralization guesses for a `<entity>_id` column's likely
    target table name (e.g. "customer" -> {"customer", "customers"})."""
    candidates = {entity}
    if entity.endswith("y") and not entity.endswith(("ay", "ey", "oy", "uy")):
        candidates.add(entity[:-1] + "ies")
    else:
        candidates.add(entity + "s")
    candidates.add(entity + "es")
    return candidates


def _infer_relationships(tables_columns: dict[str, list[ColumnInfo]]) -> list[ERRelationship]:
    """Heuristic FK inference: no real foreign-key metadata exists in
    Iceberg/Trino, so relationships are guessed purely from naming
    conventions (a `<entity>_id` column pointing at a table plausibly named
    `<entity>`/`<entity>s`). Not guaranteed correct - a best-effort visual aid.
    """
    tables_lower = {name.lower(): name for name in tables_columns}
    relationships: list[ERRelationship] = []
    for table, columns in tables_columns.items():
        for column in columns:
            match = _FK_COLUMN_RE.match(column.name)
            if not match or column.name.lower() == "id":
                continue
            entity = match.group(1).lower()
            target_table = next(
                (tables_lower[c] for c in _entity_table_candidates(entity) if c in tables_lower),
                None,
            )
            if target_table is None or target_table == table:
                continue
            target_columns_lower = {c.name.lower() for c in tables_columns[target_table]}
            to_column = "id" if "id" in target_columns_lower else column.name
            relationships.append(
                ERRelationship(from_table=table, from_column=column.name, to_table=target_table, to_column=to_column)
            )
    return relationships


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


@router.get("/er-diagram", response_model=ERDiagram)
def get_er_diagram(catalog: str, schema: str, user: CurrentUser = Depends(get_current_user)) -> ERDiagram:
    catalog = _validate_identifier(catalog, "catalog")
    schema = _validate_identifier(schema, "schema")
    conn = get_trino_connection(user.username)
    cur = conn.cursor()
    cur.execute(f"SHOW TABLES FROM {catalog}.{schema}")
    table_names = [row[0] for row in cur.fetchall()]

    tables_columns: dict[str, list[ColumnInfo]] = {}
    for table_name in table_names:
        cur.execute(f"DESCRIBE {catalog}.{schema}.{table_name}")
        tables_columns[table_name] = [
            ColumnInfo(name=row[0], type=row[1], extra=row[2] or None, comment=row[3] or None) for row in cur.fetchall()
        ]

    tables = [
        ERTable(
            name=table_name,
            columns=[
                ERColumn(
                    name=col.name,
                    type=col.type,
                    is_primary_key_guess=col.name.lower() in ("id", f"{table_name.lower()}_id"),
                )
                for col in cols
            ],
        )
        for table_name, cols in tables_columns.items()
    ]
    relationships = _infer_relationships(tables_columns)
    return ERDiagram(catalog=catalog, schema_name=schema, tables=tables, relationships=relationships)
