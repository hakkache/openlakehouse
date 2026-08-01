from pydantic import BaseModel


class DashboardInfo(BaseModel):
    id: int
    title: str
    url: str
    published: bool
    changed_on: str


class DashboardsStatus(BaseModel):
    available: bool
    dashboards: list[DashboardInfo]
