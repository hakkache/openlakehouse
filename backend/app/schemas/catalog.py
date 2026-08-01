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
