from pydantic import BaseModel


class ColumnInfo(BaseModel):
    name: str
    type: str
    extra: str | None = None
    comment: str | None = None


class TablePreview(BaseModel):
    columns: list[str]
    rows: list[list]
    row_count: int


class ERColumn(BaseModel):
    name: str
    type: str
    is_primary_key_guess: bool


class ERTable(BaseModel):
    name: str
    columns: list[ERColumn]


class ERRelationship(BaseModel):
    from_table: str
    from_column: str
    to_table: str
    to_column: str


class ERDiagram(BaseModel):
    catalog: str
    schema_name: str
    tables: list[ERTable]
    relationships: list[ERRelationship]
